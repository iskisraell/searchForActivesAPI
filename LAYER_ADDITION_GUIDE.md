# Layer Addition Guide

> **Purpose**: Step-by-step framework for adding new data layers to the API  
> **Last Updated**: 2025-12-15  
> **Prerequisite**: Read [AGENTS.md](./AGENTS.md) first

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Implementation Checklist](#pre-implementation-checklist)
3. [Framework Questions](#framework-questions)
4. [Implementation Steps](#implementation-steps)
5. [Code Templates](#code-templates)
6. [Documentation Sync](#documentation-sync)
7. [Testing Checklist](#testing-checklist)
8. [Examples](#examples)

---

## Overview

The API uses a **multi-layer data mesh** architecture where each layer:

- Has its own Google Sheet data source
- Joins to the main layer via anchor keys (`Nº Eletro` primary, `Nº Parada` secondary)
- Can be queried independently or merged with other layers

### Layer Types

| Type          | Description                            | Example                      |
| ------------- | -------------------------------------- | ---------------------------- |
| `main`        | Primary data source (always available) | Equipment/asset data         |
| `enrichment`  | Adds fields to main records            | Panels, maintenance          |
| `aggregation` | Computed/summarized data               | Panel counts, revenue totals |
| `reference`   | Lookup tables                          | Status codes, area mappings  |

---

## Pre-Implementation Checklist

Before starting, verify:

```
□ Google Sheet exists and is accessible
□ Service account has read access to the sheet
□ Data has a join key that exists in main sheet (Nº Eletro or Nº Parada)
□ Column names are consistent and clean
□ Data volume is reasonable (< 50,000 rows recommended)
□ Update frequency is understood (for cache duration planning)
```

---

## Framework Questions

Answer these questions before implementation. Copy this template:

````markdown
### Layer Definition: [LAYER_NAME]

**1. Basic Information**

- Layer ID: **\*\***\_**\*\*** (lowercase, single word, e.g., "panels", "maintenance")
- Layer Name (display): **\*\***\_**\*\*** (e.g., "Painéis", "Manutenção")
- Purpose: **\*\***\_**\*\***

**2. Data Source**

- Google Sheet ID: **\*\***\_**\*\***
- Tab/Sheet Name: **\*\***\_**\*\***
- Approximate row count: **\*\***\_**\*\***
- Update frequency: **\*\***\_**\*\*** (real-time, daily, weekly)

**3. Join Strategy**

- Primary join key: **\*\***\_**\*\*** (usually "Nº Eletro")
- Secondary join key: **\*\***\_**\*\*** (optional, e.g., "Nº Parada")
- Join type: **\*\***\_**\*\*** (1:1, 1:many, many:1)
- Handle missing matches: **\*\***\_**\*\*** (null, empty object, skip)

**4. Fields to Expose**
List all fields from this sheet that should be in the API:
| Sheet Column | API Field Name | Type | Description |
|--------------|---------------|------|-------------|
| | | | |

**5. Filters**
New filter parameters this layer should support:
| Parameter | Field | Type | Example |
|-----------|-------|------|---------|
| | | | |

**6. Caching**

- Cache duration: **\*\***\_**\*\*** seconds (300-600 recommended)
- Cache key prefix: **\*\***\_**\*\*** (e.g., "panels_v1")

**7. Transformations**
Any data transformations needed:

- [ ] Numeric parsing (e.g., "1,5" → 1.5)
- [ ] Date formatting
- [ ] Null/empty handling
- [ ] Calculated fields
- [ ] Other: **\*\***\_**\*\***

**8. Output Structure**
How should this layer appear in the API response?

Option A - Flat merge:

```json
{ "Nº Eletro": "A01516", "Status": "Ativo", "digitalPanels": 2 }
```
````

Option B - Nested object:

```json
{ "Nº Eletro": "A01516", "panels": { "digital": 2, "static": 1 } }
```

Selected option: **\*\***\_**\*\***

````

---

## Implementation Steps

### Step 1: Update CONFIG

Add the layer definition to `CONFIG.LAYERS` in `Código.js`:

```javascript
var CONFIG = {
  // ... existing config ...

  LAYERS: {
    main: { /* existing */ },

    // NEW LAYER
    newlayer: {
      sheetId: 'YOUR_SHEET_ID',
      tabName: 'YOUR_TAB_NAME',
      joinKey: 'Nº Eletro',
      secondaryJoinKey: 'Nº Parada',  // optional
      cacheDuration: 600,
      fields: [
        'Field1',
        'Field2'
      ]
    }
  }
};
````

### Step 2: Create Fetch Function

Add a function to fetch data from the new layer:

```javascript
// ┌─────────────────────────────────────────┐
// │  LAYER: NEW_LAYER                       │
// └─────────────────────────────────────────┘

function fetchNewLayerData() {
  var cache = CacheService.getScriptCache();
  var cacheKey = "newlayer_data_v1";

  // Try cache first
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      /* cache corrupted, fetch fresh */
    }
  }

  // Fetch from sheet
  var layer = CONFIG.LAYERS.newlayer;
  var ss = SpreadsheetApp.openById(layer.sheetId);
  var sheet = ss.getSheetByName(layer.tabName);

  if (!sheet) {
    throw new Error("Sheet not found: " + layer.tabName);
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);

  // Build index by join key
  var index = {};
  var joinKeyIdx = headers.indexOf(layer.joinKey);

  rows.forEach(function (row) {
    var key = String(row[joinKeyIdx]).trim();
    if (key) {
      index[key] = rowToObject(row, headers, layer.fields);
    }
  });

  // Cache the index
  try {
    var cacheData = JSON.stringify(index);
    if (cacheData.length < 100000) {
      cache.put(cacheKey, cacheData, layer.cacheDuration);
    }
  } catch (e) {
    /* cache write failed */
  }

  return index;
}

function rowToObject(row, headers, fieldsToInclude) {
  var obj = {};
  headers.forEach(function (h, i) {
    if (!fieldsToInclude || fieldsToInclude.indexOf(h) > -1) {
      obj[h] = row[i];
    }
  });
  return obj;
}
```

### Step 3: Create Merge Function

Add logic to merge the new layer with main data:

```javascript
function mergeWithNewLayer(mainData, newLayerIndex) {
  return mainData.map(function (record) {
    var key = record["Nº Eletro"];
    var layerData = newLayerIndex[key] || null;

    if (layerData) {
      // Option A: Flat merge
      // Object.keys(layerData).forEach(function(k) {
      //   record[k] = layerData[k];
      // });

      // Option B: Nested object
      record.newlayer = layerData;
    } else {
      record.newlayer = null;
    }

    return record;
  });
}
```

### Step 4: Update Layer Router

Modify `getData()` to handle the new layer:

```javascript
function getData(params) {
  var layer = params.layer || "main";

  switch (layer) {
    case "main":
      return fetchMainData(params);

    case "newlayer":
      return fetchNewLayerOnly(params);

    case "full":
      var mainData = fetchMainData(params);
      var newLayerIndex = fetchNewLayerData();
      mainData.data = mergeWithNewLayer(mainData.data, newLayerIndex);
      return mainData;

    default:
      throw new Error(
        "Unknown layer: " + layer + ". Valid: main, newlayer, full",
      );
  }
}
```

### Step 5: Add New Filter Parameters

Update `parseParameters()`:

```javascript
function parseParameters(e) {
  var p = e.parameter || {};

  return {
    // ... existing params ...

    // Layer selection
    layer: p.layer || "main",

    // New layer filters
    newLayerFilters: {
      field1: p.field1 || null,
      field2: p.field2 === "true" ? true : p.field2 === "false" ? false : null,
    },
  };
}
```

### Step 6: Update Meta Endpoint

Add the new layer to the meta response:

```javascript
function getLayersMeta() {
  var layers = [];

  for (var layerId in CONFIG.LAYERS) {
    var layer = CONFIG.LAYERS[layerId];
    layers.push({
      id: layerId,
      name: layer.displayName || layerId,
      source: { sheetId: layer.sheetId, tab: layer.tabName },
      joinKey: layer.joinKey,
      fields: layer.fields || [],
      cacheDuration: layer.cacheDuration || CONFIG.CACHE_DURATION_SECONDS,
    });
  }

  return { layers: layers };
}
```

---

## Code Templates

### Template: Layer CONFIG Entry

```javascript
layername: {
  sheetId: '',           // Required: Google Sheet ID
  tabName: '',           // Required: Tab/sheet name
  displayName: '',       // Optional: Human-readable name
  joinKey: 'Nº Eletro',  // Required: Primary join field
  secondaryJoinKey: '',  // Optional: Fallback join field
  cacheDuration: 600,    // Optional: Cache TTL in seconds
  fields: [],            // Optional: Fields to include (null = all)
  transformations: {}    // Optional: Field transformations
}
```

### Template: Fetch Function

```javascript
function fetch[LayerName]Data() {
  var cache = CacheService.getScriptCache();
  var cacheKey = '[layername]_data_v1';
  var layer = CONFIG.LAYERS.[layername];

  // Check cache
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { }
  }

  // Fetch from sheet
  var ss = SpreadsheetApp.openById(layer.sheetId);
  var sheet = ss.getSheetByName(layer.tabName);
  if (!sheet) throw new Error('Sheet not found: ' + layer.tabName);

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);

  // Build index
  var index = {};
  var joinIdx = headers.indexOf(layer.joinKey);

  rows.forEach(function(row) {
    var key = String(row[joinIdx]).trim();
    if (key) {
      index[key] = {};
      headers.forEach(function(h, i) {
        if (!layer.fields || layer.fields.indexOf(h) > -1) {
          index[key][h] = row[i];
        }
      });
    }
  });

  // Cache
  try {
    cache.put(cacheKey, JSON.stringify(index), layer.cacheDuration || 600);
  } catch (e) { }

  return index;
}
```

### Template: Merge Function

```javascript
function mergeWith[LayerName](mainData, layerIndex) {
  return mainData.map(function(record) {
    var key = record['Nº Eletro'];
    record.[layername] = layerIndex[key] || null;
    return record;
  });
}
```

---

## Documentation Sync

**CRITICAL**: After adding a layer, update ALL THREE documentation sources:

### 1. Update `API_DOCUMENTATION.md`

Add to Parameters section:

```markdown
### Layer Selection

| Parameter | Type   | Default | Values               |
| --------- | ------ | ------- | -------------------- |
| `layer`   | string | main    | main, newlayer, full |

### [New Layer] Filters

| Parameter | Type   | Description      |
| --------- | ------ | ---------------- |
| `field1`  | string | Filter by field1 |
```

Add to Fields section:

```markdown
### [New Layer] Fields (layer=newlayer or layer=full)

| Field    | Type   | Description |
| -------- | ------ | ----------- |
| `field1` | string | Description |
```

### 2. Update `index.html`

Add new section to sidebar:

```html
<li><a href="#layers">Camadas de Dados</a></li>
```

Add new content section with tables for parameters and fields.

### 3. Update `Código.js` inline docs

Update `returnDocumentation()` with new parameters and fields.

Update `serveDocumentationPage()` HTML with new sections.

### 4. Version Bump

Update version in ALL locations:

- `CONFIG.API_VERSION`
- `API_DOCUMENTATION.md` header
- `index.html` badge and footer
- `serveDocumentationPage()` badge

---

## Testing Checklist

Before deploying a new layer:

```
□ Basic fetch works
  curl "?layer=newlayer&limit=5"

□ Join works correctly
  curl "?layer=full&limit=5"
  → Verify newlayer data appears in response

□ Filters work
  curl "?layer=full&newfilter=value"

□ Edge cases handled
  - Records with no match in new layer
  - Empty/null values in join key
  - Special characters in data

□ Performance acceptable
  - Cached: < 500ms
  - Uncached: < 3000ms

□ Meta endpoint updated
  curl "?meta=layers"
  → Verify new layer appears

□ Documentation complete
  - API_DOCUMENTATION.md updated
  - index.html updated
  - Código.js inline docs updated
  - Version incremented

□ Backward compatibility
  - Existing queries without layer param work unchanged
  - No breaking changes to response structure
```

---

## Examples

### Example: Adding Panels Layer

**Framework Questions Answers:**

````markdown
### Layer Definition: panels

**1. Basic Information**

- Layer ID: panels
- Layer Name: Painéis
- Purpose: Accurate panel count data for shelters

**2. Data Source**

- Google Sheet ID: 19aG4aS4iH42vbVwi6JJ9aKuhYQmXQ2fMcOSRWl7ochY
- Tab/Sheet Name: Pontos não SEP
- Approximate row count: 6,200
- Update frequency: Weekly

**3. Join Strategy**

- Primary join key: Nº Eletro
- Secondary join key: Nº Parada
- Join type: 1:1
- Handle missing matches: null

**4. Fields to Expose**
| Sheet Column | API Field Name | Type |
|--------------|---------------|------|
| QTDE. CAIXA DIGITAL | digitalBoxes | number |
| FACE DIGITAL | digitalFaces | number |
| DIGITAL POSIÇÃO | digitalPosition | string |
| DIGITAL TIPO | digitalType | string |
| QTDE. CAIXA ESTATICA | staticBoxes | number |
| FACE ESTATICA | staticFaces | number |
| ESTATICO POSIÇÃO | staticPosition | string |
| ESTATICO TIPOS | staticType | string |
| Modelo de Abrigo | shelterModel | string |

**5. Filters**
| Parameter | Field | Type |
|-----------|-------|------|
| hasDigital | digitalBoxes > 0 | bool |
| hasStatic | staticBoxes > 0 | bool |
| modelo | shelterModel | string |

**6. Caching**

- Cache duration: 600 seconds
- Cache key prefix: panels_v1

**7. Transformations**

- [x] Numeric parsing (empty → 0)
- [ ] Date formatting
- [x] Null/empty handling

**8. Output Structure**
Selected option: B - Nested object

```json
{
  "Nº Eletro": "A01516",
  "panels": {
    "digital": { "boxes": 0, "faces": 0, "position": null, "type": null },
    "static": {
      "boxes": 2,
      "faces": 2,
      "position": "180°",
      "type": "SIMPLES/SUSPENSO"
    },
    "shelterModel": "CAOS LEVE"
  }
}
```
````

````

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Sheet not found" | Wrong tab name or sheet ID | Verify in Google Sheets URL |
| Join returns null for all | Join key mismatch | Check column names exactly match |
| Performance slow | No caching or large dataset | Increase cache duration, limit fields |
| Partial data | Some rows missing join key | Add validation/logging |

### Debug Logging

```javascript
// Add to fetch function for debugging
Logger.log('Layer: ' + layerId + ', Records: ' + Object.keys(index).length);
Logger.log('Sample keys: ' + Object.keys(index).slice(0, 5).join(', '));
````

---

## Version History

| Version | Date       | Changes           |
| ------- | ---------- | ----------------- |
| 1.0     | 2025-12-15 | Initial framework |

---

## See Also

- [AGENTS.md](./AGENTS.md) - Project context and standards
- [API_DOCUMENTATION.md](./assets/API_DOCUMENTATION.md) - API reference
