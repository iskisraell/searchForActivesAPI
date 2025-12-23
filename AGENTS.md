# AGENTS.md - Project Context & Standards

> **Project**: Search for Actives API  
> **Version**: 5.2.0 (Multi-Layer Architecture with Abrigo Amigo)  
> **Last Updated**: 2025-12-23  
> **Platform**: Google Apps Script

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Coding Standards](#coding-standards)
5. [Documentation Policy](#documentation-policy)
6. [Deployment Process](#deployment-process)
7. [Testing & Validation](#testing--validation)

---

## Project Overview

### Purpose

REST API for querying equipment and asset data from Eletromidia's operational database. Provides access to 22,000+ shelter/totem records with support for multi-layer data enrichment from multiple Google Sheets sources.

### Key Features

- **Multi-layer data mesh**: Join data from multiple Google Sheets via anchor keys
- **High performance**: Caching, pagination, sparse fieldsets
- **Flexible querying**: Text search, filters, geospatial queries
- **Self-documenting**: Built-in HTML documentation, meta introspection
- **Abrigo Amigo integration**: Women's safety initiative layer with 305 equipped bus stops

### Tech Stack

| Component   | Technology                  |
| ----------- | --------------------------- |
| Runtime     | Google Apps Script (V8)     |
| Data Source | Google Sheets               |
| Deployment  | clasp CLI                   |
| Caching     | CacheService (script-level) |
| Output      | JSON REST API               |

---

## Architecture

### Multi-Layer Data Mesh

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           API REQUEST                                    │
│              ?layer=full&cidade=SÃO PAULO&abrigoAmigo=true              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         LAYER ROUTER                                     │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐   │
│  │layer=main│ │layer=    │ │layer=      │ │layer=full│ │layer=    │   │
│  │(default) │ │panels    │ │abrigoamigo │ │(merged)  │ │summary   │   │
│  └────┬─────┘ └────┬─────┘ └─────┬──────┘ └────┬─────┘ └────┬─────┘   │
└───────┼────────────┼─────────────┼─────────────┼────────────┼──────────┘
        │            │             │             │            │
        ▼            ▼             ▼             ▼            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                                      │
│                                                                          │
│  ┌────────────────────────┐      ┌────────────────────────┐             │
│  │     MAIN SHEET         │      │    PANELS SHEET        │             │
│  │  "Pontos não SEP"      │◄────►│  "Pontos não SEP"      │             │
│  │   Sheet: 1e1cvse...    │  JOIN│   Sheet: 19aG4aS...    │             │
│  │   22,000+ records      │  ON  │   2,498 records        │             │
│  │                        │  Nº  │                        │             │
│  │  Fields:               │ Eletro                        │             │
│  │  - Nº Eletro (PK)      │      │  Fields:               │             │
│  │  - Nº Parada           │      │  - Nº Eletro (FK)      │             │
│  │  - Status, Location    │      │  - Digital panels      │             │
│  │  - Coordinates         │      │  - Static panels       │             │
│  └────────────────────────┘      └────────────────────────┘             │
│                                                                          │
│  ┌────────────────────────┐      ┌────────────────────────┐             │
│  │   ABRIGO AMIGO SHEET   │      │   FUTURE LAYER         │             │
│  │  "ABRIGO AMIGO"        │      │   (e.g., Maintenance)  │             │
│  │   Sheet: 1p6V16c...    │      │                        │             │
│  │   305 records          │      └────────────────────────┘             │
│  │                        │                                              │
│  │  Fields:               │                                              │
│  │  - Nº PARADA (FK)      │                                              │
│  │  - Cliente             │                                              │
│  │  - Enabled             │                                              │
│  └────────────────────────┘                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Join Strategy

```
PRIMARY KEY:    Nº Eletro  (unique shelter ID, e.g., "A01516")
                     │
SECONDARY KEY:  Nº Parada  (bus stop ID, may have suffixes like "920016960-1")
                     │
                     ▼
            ┌───────────────────┐
            │   JOIN LOGIC      │
            │                   │
            │  1. Panels join   │
            │     by Nº Eletro  │
            │     (exact)       │
            │                   │
            │  2. Abrigo Amigo  │
            │     joins by      │
            │     Nº Parada     │
            │     (normalized)  │
            └───────────────────┘
```

---

## File Structure

```
searchForActivesAPI/
├── Código.js                    # Main API code (Apps Script)
├── index.html                   # Standalone HTML documentation
├── appsscript.json             # Apps Script manifest
├── .clasp.json                 # Clasp deployment config
├── AGENTS.md                   # This file - project context
├── LAYER_ADDITION_GUIDE.md     # Framework for adding new layers
├── assets/
│   ├── API_DOCUMENTATION.md    # Markdown API docs
│   └── *.csv                   # Sample data files
└── samples/
    ├── README.md               # Sample files overview
    ├── sample_basic.json       # Basic API response
    ├── sample_layer_*.json     # Layer-specific samples
    ├── sample_meta_*.json      # Metadata samples
    └── ...                     # Other sample files
```

### File Purposes

| File                      | Purpose                         | Update Frequency     |
| ------------------------- | ------------------------------- | -------------------- |
| `Código.js`               | All API logic, served docs      | Every feature change |
| `index.html`              | Standalone docs (can be hosted) | Sync with Código.js  |
| `API_DOCUMENTATION.md`    | Developer reference             | Sync with Código.js  |
| `AGENTS.md`               | AI/developer context            | Architecture changes |
| `LAYER_ADDITION_GUIDE.md` | Layer addition framework        | Process changes      |

---

## Coding Standards

### Naming Conventions

```javascript
// Variables: camelCase
var sheetData = {};
var panelsIndex = {};
var abrigoAmigoIndex = {};

// Constants: UPPER_SNAKE_CASE (in CONFIG)
var CONFIG = {
  SHEET_ID: "...",
  MAX_LIMIT: 5000,
  CACHE_DURATION_SECONDS: 300,
};

// Functions: camelCase, verb-first
function fetchSheetData(params) {}
function buildPanelsIndex() {}
function fetchAbrigoAmigoIndex() {}
function matchesFilters(row, params) {}

// Layer IDs: lowercase, single word
// Examples: main, panels, abrigoamigo, maintenance, revenue
```

### Function Organization

```javascript
// ┌─────────────────────────────────────────┐
// │  1. CONFIGURATION                       │
// └─────────────────────────────────────────┘
var CONFIG = { ... };

// ┌─────────────────────────────────────────┐
// │  2. ENTRY POINTS                        │
// └─────────────────────────────────────────┘
function doGet(e) { }
function handleRequest(e, startTime) { }

// ┌─────────────────────────────────────────┐
// │  3. PARAMETER PARSING                   │
// └─────────────────────────────────────────┘
function parseParameters(e) { }

// ┌─────────────────────────────────────────┐
// │  4. DATA RETRIEVAL                      │
// └─────────────────────────────────────────┘
function getData(params) { }
function fetchSheetData(params) { }
function fetchLayerData(layerId) { }

// ┌─────────────────────────────────────────┐
// │  5. LAYER-SPECIFIC FUNCTIONS            │
// └─────────────────────────────────────────┘
function fetchPanelsData() { }
function buildPanelsIndex() { }
function fetchAbrigoAmigoIndex() { }      // v5.2
function getAbrigoAmigoData() { }         // v5.2
function mergeWithPanels(data) { }

// ┌─────────────────────────────────────────┐
// │  6. SEARCH STRATEGIES                   │
// └─────────────────────────────────────────┘
function performSearch() { }
function performKeyIdentifierSearch() { }

// ┌─────────────────────────────────────────┐
// │  7. HELPER FUNCTIONS                    │
// └─────────────────────────────────────────┘
function hasActiveFilters() { }
function matchesFilters() { }
function hasAbrigoAmigoFilters() { }      // v5.2
function matchesAbrigoAmigoFilters() { }  // v5.2
function rowsToJson() { }

// ┌─────────────────────────────────────────┐
// │  8. RESPONSE BUILDERS                   │
// └─────────────────────────────────────────┘
function createSuccessResponse() { }
function createError() { }

// ┌─────────────────────────────────────────┐
// │  9. DOCUMENTATION                       │
// └─────────────────────────────────────────┘
function returnDocumentation() { }
function serveDocumentationPage() { }
function getDocVersion() { }
```

### Error Handling Pattern

```javascript
function fetchLayerData(layerId) {
  try {
    var layer = CONFIG.LAYERS[layerId];
    if (!layer) {
      throw new Error("Unknown layer: " + layerId);
    }

    var ss = SpreadsheetApp.openById(layer.sheetId);
    var sheet = ss.getSheetByName(layer.tabName);

    if (!sheet) {
      throw new Error(
        "Sheet not found: " + layer.tabName + " in layer " + layerId,
      );
    }

    // ... fetch logic
  } catch (err) {
    Logger.log("Error fetching layer " + layerId + ": " + err.toString());
    throw err; // Re-throw for upstream handling
  }
}
```

### Caching Strategy

```javascript
// Cache keys follow pattern: [version]|[layer]|[params hash]
// Example: "v5.2|main|start:0|limit:1000|status:Ativo"

// Cache durations (in CONFIG)
CACHE_DURATION_SECONDS: 300,      // 5 min for main data
SEARCH_CACHE_DURATION: 120,       // 2 min for search results
LAYER_CACHE_DURATION: 600,        // 10 min for secondary layers (less volatile)

// Cache invalidation
// - Automatic expiry via CacheService TTL
// - Manual bypass via ?nocache=true parameter
```

---

## Documentation Policy

### Three-Document Sync Rule

**ALL THREE documentation sources MUST be updated together and have matching version numbers:**

| Source                 | Location                                                         | Format   |
| ---------------------- | ---------------------------------------------------------------- | -------- |
| `API_DOCUMENTATION.md` | `assets/`                                                        | Markdown |
| `index.html`           | root                                                             | HTML     |
| `Código.js`            | inline in `returnDocumentation()` and `serveDocumentationPage()` | Embedded |

### Version Format

```
v{MAJOR}.{MINOR}.{PATCH}

MAJOR: Breaking changes, new layer system
MINOR: New layers, new parameters
PATCH: Bug fixes, documentation updates

Example: v5.1.0 → v5.2.0 (added Abrigo Amigo layer)
```

### Documentation Sync Checklist

Before any deployment:

```
□ Version number updated in:
  □ CONFIG.API_VERSION in Código.js
  □ API_DOCUMENTATION.md header
  □ index.html badge and footer
  □ serveDocumentationPage() badge

□ New parameters documented in:
  □ API_DOCUMENTATION.md tables
  □ index.html parameter tables
  □ returnDocumentation() markdown

□ New fields documented in:
  □ All three "Available Fields" sections

□ Examples updated in:
  □ All three quick start sections
```

### Helper Function for Validation

```javascript
// In Código.js - validates doc sync at runtime (dev only)
function validateDocSync() {
  var configVersion = CONFIG.API_VERSION;
  var docVersion = getDocVersion(); // Parse from returnDocumentation()

  if (configVersion !== docVersion) {
    Logger.log(
      "WARNING: Doc version mismatch! CONFIG: " +
        configVersion +
        ", Docs: " +
        docVersion,
    );
  }
}
```

---

## Deployment Process

### Prerequisites

```bash
# Install clasp globally
npm install -g @google/clasp

# Login to Google
clasp login

# Verify .clasp.json has correct scriptId
```

### Deployment Steps

```bash
# 1. Push code to Apps Script
clasp push

# 2. Create new deployment (for version tracking)
clasp deploy --description "v5.2.0 - Added Abrigo Amigo layer"

# 3. Note: The deployment URL stays the same (uses @HEAD or specific version)
```

### Post-Deployment Validation

```bash
# Test basic endpoint
curl "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?limit=1"

# Test Abrigo Amigo layer
curl "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?layer=abrigoamigo&limit=5"

# Test full layer with Abrigo Amigo filter
curl "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?layer=full&abrigoAmigo=true&limit=3"

# Test meta endpoint
curl "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?meta=layers"
```

---

## Testing & Validation

### Manual Test Cases

```
1. Basic Fetch
   GET ?limit=5
   Expected: 5 records from main sheet

2. Layer Selection
   GET ?layer=main&limit=5         → main data only
   GET ?layer=panels&limit=5       → panels data only
   GET ?layer=abrigoamigo&limit=5  → Abrigo Amigo data only (NEW v5.2)
   GET ?layer=full&limit=5         → merged data
   GET ?layer=summary&limit=5      → aggregated counts

3. Filters with Layers
   GET ?layer=full&cidade=SÃO PAULO&hasDigital=true
   Expected: Only records with digital panels in São Paulo

4. Abrigo Amigo Filters (NEW v5.2)
   GET ?layer=full&abrigoAmigo=true
   Expected: Only Abrigo Amigo equipped stops

   GET ?layer=summary&cliente=Claro
   Expected: Only Claro-sponsored Abrigo Amigo stops

5. Meta Introspection
   GET ?meta=layers
   Expected: List of all available layers (including abrigoamigo)

6. Backward Compatibility
   GET ?limit=5 (no layer param)
   Expected: Same response as v4.0 (main only)

7. Error Cases
   GET ?layer=invalid
   Expected: Error response with valid layer list
```

### Performance Benchmarks

| Query Type                      | Target Response Time |
| ------------------------------- | -------------------- |
| Cached main (1000 records)      | < 500ms              |
| Uncached main (1000 records)    | < 2000ms             |
| Full layer merge (1000 records) | < 3000ms             |
| Abrigo Amigo layer              | < 500ms              |
| Meta introspection              | < 200ms              |

---

## Quick Reference

### CONFIG Structure (v5.2.0)

```javascript
var CONFIG = {
  // API Metadata
  API_VERSION: "5.2.0",

  // Main Sheet (existing)
  SHEET_ID: "1e1cvseL1_S0Kyr-DFPa-tFsS2rVGZ7qqvBku51jhmbE",
  SHEET_NAME: "Pontos não SEP",

  // Layer Definitions
  LAYERS: {
    main: {
      sheetId: "1e1cvseL1_S0Kyr-DFPa-tFsS2rVGZ7qqvBku51jhmbE",
      tabName: "Pontos não SEP",
      joinKey: "Nº Eletro",
      secondaryJoinKey: "Nº Parada",
      isDefault: true,
    },
    panels: {
      sheetId: "19aG4aS4iH42vbVwi6JJ9aKuhYQmXQ2fMcOSRWl7ochY",
      tabName: "Pontos não SEP ",
      joinKey: "Nº Eletro",
      secondaryJoinKey: "Nº Parada",
      cacheDuration: 600,
      excludeColumns: ["Nº PARADA NOVO"],
    },
    abrigoamigo: {
      sheetId: "1p6V16c0iZDAgL-zrlHjlfH4FwuucvbEf9miVylfhWVE",
      tabName: "ABRIGO AMIGO",
      joinKey: "Nº PARADA",
      cacheDuration: 600,
      description:
        "Women's safety initiative - interactive safety hubs at bus stops (8PM-5AM)",
    },
  },

  // Limits
  MAX_LIMIT: 5000,
  DEFAULT_LIMIT: 1000,
  SEARCH_LIMIT: 100,

  // Caching
  CACHE_DURATION_SECONDS: 300,
  SEARCH_CACHE_DURATION: 120,
  LAYER_CACHE_DURATION: 600,

  // Rate Limiting
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 60000,
};
```

---

## See Also

- [LAYER_ADDITION_GUIDE.md](./LAYER_ADDITION_GUIDE.md) - How to add new data layers
- [API_DOCUMENTATION.md](./assets/API_DOCUMENTATION.md) - API reference
- [index.html](./index.html) - Interactive documentation
