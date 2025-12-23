# Equipment Assets API Documentation

> **Version**: 5.2.0 (Multi-Layer Architecture)  
> **Last Updated**: 2025-12-23

## Overview

High-performance REST API for querying equipment/asset data from a database of 22,000+ records. Built with multi-layer data mesh, caching, multi-field filtering, and optimized for fast full-payload retrieval.

### New in v5.2

- **Abrigo Amigo layer**: Women's safety initiative data (264 equipped bus stops)
- **New filters**: `abrigoAmigo`, `cliente` for filtering Abrigo Amigo equipped shelters
- **Summary enhancement**: `hasAbrigoAmigo`, `abrigoAmigoCliente` fields in summary layer

### New in v5.1

- **Digital panel brand**: `digital.brand` field with panel brand/model (BOE, CHINA, LG, etc.)

### New in v5.0

- **Multi-layer data mesh**: Query main data, panels data, or merged views
- **Panels layer**: Accurate panel counts from dedicated source
- **Meta introspection**: `?meta=layers` for API self-discovery
- **Panel filters**: `hasDigital`, `hasStatic`, `modelo`

---

## Base URL

```
https://script.google.com/macros/s/AKfycbzXpzgaA64P147rIqeaLEkCZ4YQcz5rJOn89Ag8Pf3p8EIg0Beisa9dS0OL-UEOsIWL/exec
```

---

## Quick Start

```bash
# Get first 1000 records (main layer - default)
curl "BASE_URL?limit=1000"

# Get full data with panels merged
curl "BASE_URL?layer=full&limit=100"

# Get only shelters with digital panels
curl "BASE_URL?layer=full&hasDigital=true"

# Get summary with panel counts
curl "BASE_URL?layer=summary&limit=100"

# Introspect available layers
curl "BASE_URL?meta=layers"

# Search by Nº Eletro
curl "BASE_URL?neletro=A08802"

# Filter by city and status
curl "BASE_URL?status=Ativo&cidade=SÃO PAULO"

# Get only specific fields
curl "BASE_URL?fields=Nº Eletro,Latitude,Longitude,Status"
```

---

## Parameters

### Layer Selection (NEW in v5.0)

| Parameter | Type   | Default | Values                                   | Description         |
| --------- | ------ | ------- | ---------------------------------------- | ------------------- |
| `layer`   | string | main    | main, panels, abrigoamigo, full, summary | Data layer to query |

**Layer descriptions:**

- `main` - Main equipment data only (backward compatible)
- `panels` - Panels data only
- `abrigoamigo` - Abrigo Amigo equipped shelters only (NEW v5.2)
- `full` - Main data merged with panels and Abrigo Amigo (nested objects)
- `summary` - Main data with panel count fields and Abrigo Amigo flags added

### Meta Introspection (NEW in v5.0)

| Parameter | Type   | Values                  | Description            |
| --------- | ------ | ----------------------- | ---------------------- |
| `meta`    | string | layers, version, schema | API introspection data |

### Pagination

| Parameter | Type   | Default | Max  | Description                                    |
| --------- | ------ | ------- | ---- | ---------------------------------------------- |
| `start`   | int    | 0       | -    | Offset for pagination                          |
| `limit`   | int    | 1000    | 5000 | Records per request                            |
| `after`   | string | -       | -    | Cursor (Nº Eletro) for cursor-based pagination |

### Search & Filtering

| Parameter  | Type   | Description                                  |
| ---------- | ------ | -------------------------------------------- |
| `q`        | string | Full-text search across all fields           |
| `nparada`  | string | Search by Nº Parada (exact or partial match) |
| `neletro`  | string | Search by Nº Eletro (exact or partial match) |
| `endereco` | string | Search by Endereço (address, partial match)  |
| `status`   | string | Filter by Status (e.g., "Ativo")             |
| `cidade`   | string | Filter by city                               |
| `estado`   | string | Filter by state (e.g., "SP")                 |
| `bairro`   | string | Filter by neighborhood                       |
| `area`     | string | Filter by work area                          |
| `praca`    | string | Filter by region                             |
| `filial`   | string | Filter by branch                             |

### Panel Filters (NEW in v5.0)

| Parameter    | Type   | Description                                 | Layers                |
| ------------ | ------ | ------------------------------------------- | --------------------- |
| `hasDigital` | bool   | Filter shelters with digital panels         | panels, full, summary |
| `hasStatic`  | bool   | Filter shelters with static panels          | panels, full, summary |
| `modelo`     | string | Filter by shelter model (e.g., "CAOS LEVE") | panels, full, summary |

### Abrigo Amigo Filters (NEW in v5.2)

| Parameter     | Type   | Description                                  | Layers                     |
| ------------- | ------ | -------------------------------------------- | -------------------------- |
| `abrigoAmigo` | bool   | Filter shelters with Abrigo Amigo technology | abrigoamigo, full, summary |
| `cliente`     | string | Filter by sponsor (Claro, Governo)           | abrigoamigo, full, summary |

**About Abrigo Amigo:** Award-winning social initiative by Eletromidia and AlmapBBDO designed to protect women at night. From 8:00 PM to 5:00 AM, digital advertising displays at bus stops transform into interactive safety hubs with cameras, microphones, and real-time video calls.

### Geospatial

| Parameter | Type  | Description                 |
| --------- | ----- | --------------------------- |
| `lat`     | float | Latitude for radius search  |
| `lon`     | float | Longitude for radius search |
| `radius`  | float | Radius in km (default: 5)   |

### Field Selection

| Parameter | Type   | Description                           |
| --------- | ------ | ------------------------------------- |
| `fields`  | string | Comma-separated field names to return |

### Cache Control

| Parameter | Type | Description                   |
| --------- | ---- | ----------------------------- |
| `nocache` | bool | Set to "true" to bypass cache |

---

## Response Format

### Standard Response (layer=main)

```json
{
  "status": "success",
  "meta": {
    "apiVersion": "5.0.0",
    "layer": "main",
    "count": 1000,
    "total": 22038,
    "cached": true,
    "cacheExpires": "2025-12-15T14:05:00.000Z",
    "executionTimeMs": 234
  },
  "links": {
    "self": "?start=0&limit=1000",
    "next": "?start=1000&limit=1000"
  },
  "count": 1000,
  "total": 22038,
  "data": [
    {
      "Nº Eletro": "A08802",
      "Nº Parada": 480014794,
      "Status": "Ativo",
      ...
    }
  ]
}
```

### Full Layer Response (layer=full)

```json
{
  "status": "success",
  "meta": {
    "apiVersion": "5.2.0",
    "layer": "full",
    "count": 100,
    "total": 100
  },
  "data": [
    {
      "Nº Eletro": "A01516",
      "Nº Parada": "20014641",
      "Status": "Ativo",
      "Cidade": "SÃO PAULO",
      "panels": {
        "digital": {
          "boxes": 1,
          "faces": 1,
          "position": "90°",
          "type": "SIMPLES",
          "brand": "BOE/AA"
        },
        "static": {
          "boxes": 2,
          "faces": 2,
          "position": "180°",
          "type": "SIMPLES/SUSPENSO"
        },
        "shelterModel": "CAOS LEVE",
        "hasDigital": true,
        "hasStatic": true,
        "totalPanels": 3
      },
      "abrigoAmigo": {
        "enabled": true,
        "cliente": "Claro",
        "paradaOriginal": "20014641"
      }
    }
  ]
}
```

### Summary Layer Response (layer=summary)

```json
{
  "status": "success",
  "meta": { "layer": "summary" },
  "data": [
    {
      "Nº Eletro": "A01516",
      "Nº Parada": "20014641",
      "Status": "Ativo",
      "digitalPanels": 0,
      "staticPanels": 2,
      "totalPanels": 2,
      "hasDigital": false,
      "hasStatic": true,
      "shelterModel": "CAOS LEVE",
      "hasAbrigoAmigo": true,
      "abrigoAmigoCliente": "Claro"
    }
  ]
}
```

### Abrigo Amigo Layer Response (layer=abrigoamigo) NEW v5.2

```json
{
  "status": "success",
  "meta": {
    "apiVersion": "5.2.0",
    "layer": "abrigoamigo",
    "count": 264,
    "total": 264
  },
  "data": [
    {
      "Nº Parada": "20014641",
      "enabled": true,
      "cliente": "Claro",
      "paradaOriginal": "20014641"
    }
  ]
}
```

### Meta Response (meta=layers)

```json
{
  "apiVersion": "5.0.0",
  "layers": [
    {
      "id": "main",
      "name": "Ativos Principais",
      "isDefault": true
    },
    {
      "id": "panels",
      "name": "Painéis"
    },
    {
      "id": "full",
      "name": "Dados Completos (Main + Panels)",
      "type": "merged"
    },
    {
      "id": "summary",
      "name": "Resumo com Contagem de Painéis",
      "type": "aggregated"
    }
  ],
  "availableFilters": {
    "main": ["status", "cidade", "estado", "bairro"],
    "panels": ["hasDigital", "hasStatic", "modelo"],
    "full": ["status", "cidade", "hasDigital", "hasStatic", "modelo"]
  }
}
```

---

## Examples

### Full Dataset Download (Chunked)

```javascript
async function downloadAllData() {
  const baseUrl = "YOUR_API_URL";
  const limit = 5000;
  let allData = [];
  let start = 0;
  let total = Infinity;

  while (start < total) {
    const response = await fetch(`${baseUrl}?start=${start}&limit=${limit}`);
    const result = await response.json();

    allData = allData.concat(result.data);
    total = result.total;
    start += limit;

    console.log(`Downloaded ${allData.length}/${total}`);
  }

  return allData;
}
```

### Get All Shelters with Digital Panels

```bash
curl "BASE_URL?layer=full&hasDigital=true"
```

### Get Panel Summary for São Paulo

```bash
curl "BASE_URL?layer=summary&cidade=SÃO PAULO&fields=Nº Eletro,digitalPanels,staticPanels,totalPanels"
```

### Filtered Query

```bash
# All active equipment in São Paulo
curl "BASE_URL?status=Ativo&cidade=SÃO PAULO"

# Equipment within 2km of coordinates
curl "BASE_URL?lat=-23.55&lon=-46.68&radius=2"
```

---

## Error Responses

### 429 Rate Limited

```json
{
  "status": "error",
  "code": 429,
  "message": "Too many requests. Please retry after 60 seconds.",
  "meta": { "retryAfter": 60 }
}
```

### Unknown Layer

```json
{
  "status": "error",
  "message": "Unknown layer: invalid. Valid layers: main, panels, abrigoamigo, full, summary"
}
```

### General Error

```json
{
  "status": "error",
  "message": "Sheet not found: Pontos não SEP"
}
```

---

## Performance Tips

1. **Use caching**: Default 5-min cache, subsequent requests are ~10x faster
2. **Use `layer=main`**: Fastest option when you don't need panel data
3. **Limit fields**: Use `fields` param to reduce payload size
4. **Paginate wisely**: Use max `limit=5000` for bulk downloads
5. **Filter server-side**: Use filter params instead of client-side filtering
6. **Use cursors**: For sequential access, `after` param is O(1) performance

---

## Rate Limits

- **100 requests per minute** per deployment
- Exceeding returns 429 with `retryAfter` header

---

## Available Fields

### Main Layer Fields

| Field                     | Type   | Example                |
| ------------------------- | ------ | ---------------------- |
| `Nº Eletro`               | string | "A08802"               |
| `Nº Parada`               | number | 480014794              |
| `Identificador do Local`  | string | ""                     |
| `Ponto`                   | string | "ABRIGOS CSP"          |
| `Área de Trabalho`        | string | "Zona Oeste - SP"      |
| `Endereço`                | string | "PRAÇA DOUTOR..."      |
| `Bairro`                  | string | "LAPA"                 |
| `Cidade`                  | string | "SÃO PAULO"            |
| `Estado`                  | string | "SP"                   |
| `Praça`                   | string | "SP"                   |
| `Tipo de Equipamento`     | string | ""                     |
| `Tipo de Estabelecimento` | string | "Abrigos São Paulo..." |
| `Latitude`                | number | -23.537233             |
| `Longitude`               | number | -46.707552             |
| `Status`                  | string | "Ativo"                |
| `Data Cadastro`           | string | "29/08/2025 19:18:12"  |
| `Filial`                  | string | "Matriz"               |
| `Link Operações`          | string | "https://operacoes..." |
| `Foto Referência`         | string | "https://operacoes..." |

### Panels Layer Fields (layer=full or layer=panels)

| Field                     | Type    | Description                            |
| ------------------------- | ------- | -------------------------------------- |
| `panels.digital.boxes`    | number  | Digital panel box count                |
| `panels.digital.faces`    | number  | Digital panel face count               |
| `panels.digital.position` | string  | Position (45°, 90°, 180°)              |
| `panels.digital.type`     | string  | Mount type (SIMPLES)                   |
| `panels.digital.brand`    | string  | Brand/model (BOE, CHINA, LG, etc.) NEW |
| `panels.static.boxes`     | number  | Static panel box count                 |
| `panels.static.faces`     | number  | Static panel face count                |
| `panels.static.position`  | string  | Position                               |
| `panels.static.type`      | string  | Type (SIMPLES, SUSPENSO, DUPLA FACE)   |
| `panels.shelterModel`     | string  | Shelter model (CAOS LEVE, etc.)        |
| `panels.hasDigital`       | boolean | Has any digital panels                 |
| `panels.hasStatic`        | boolean | Has any static panels                  |
| `panels.totalPanels`      | number  | Total panel count                      |

### Summary Layer Additional Fields (layer=summary)

| Field                | Type    | Description             |
| -------------------- | ------- | ----------------------- |
| `digitalPanels`      | number  | Digital panel count     |
| `staticPanels`       | number  | Static panel count      |
| `totalPanels`        | number  | Total panels            |
| `hasDigital`         | boolean | Has digital panels      |
| `hasStatic`          | boolean | Has static panels       |
| `shelterModel`       | string  | Shelter model           |
| `hasAbrigoAmigo`     | boolean | Has Abrigo Amigo (v5.2) |
| `abrigoAmigoCliente` | string  | Sponsor (Claro/Governo) |

### Abrigo Amigo Layer Fields (layer=abrigoamigo or layer=full) NEW v5.2

| Field                        | Type    | Description                                |
| ---------------------------- | ------- | ------------------------------------------ |
| `abrigoAmigo.enabled`        | boolean | Has Abrigo Amigo technology                |
| `abrigoAmigo.cliente`        | string  | Sponsor (Claro, Governo)                   |
| `abrigoAmigo.paradaOriginal` | string  | Original Nº Parada from Abrigo Amigo sheet |

**About Abrigo Amigo:** Award-winning social initiative by Eletromidia and AlmapBBDO designed to protect women at night. From 8:00 PM to 5:00 AM, digital advertising displays at 264 bus stops in São Paulo transform into interactive safety hubs with cameras, microphones, and real-time video calls.

---

## Changelog

### v5.2.0 (2025-12-23)

- Added **Abrigo Amigo layer**: Women's safety initiative data for 264 equipped bus stops
- New `layer=abrigoamigo` for querying only Abrigo Amigo equipped shelters
- New filters: `abrigoAmigo` (bool), `cliente` (string: Claro, Governo)
- Updated `layer=full` to include `abrigoAmigo` nested object
- Updated `layer=summary` to include `hasAbrigoAmigo` and `abrigoAmigoCliente` fields
- Join is performed via `Nº Parada` (secondary key)

### v5.1.0 (2025-12-20)

- Added `digital.brand` field for panel brand/model (BOE, CHINA, LG, etc.)
- Updated documentation with new field descriptions

### v5.0.0 (2025-12-15)

- Added multi-layer data mesh architecture
- Added panels layer with accurate panel counts
- Added `?meta` endpoint for API introspection
- Added panel filters: `hasDigital`, `hasStatic`, `modelo`
- Added `layer` parameter: main, panels, full, summary
- Response now includes `apiVersion` and `layer` in meta

### v4.0.0 (2025-12-12)

- Initial SOTA optimized version
- Caching, pagination, filtering, geospatial
