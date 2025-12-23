// ---------------------------------------------------------------------------
// GOOGLE APPS SCRIPT CODE - SOTA OPTIMIZED V5
// Features: Multi-Layer Data Mesh, Caching, Multi-field Filtering,
//           Sparse Fieldsets, Cursor Pagination, Enhanced Error Handling,
//           Rate Limiting, Rich Metadata, Meta Introspection
// ---------------------------------------------------------------------------

// Configuration
var CONFIG = {
  // API Metadata
  API_VERSION: "5.2.0",

  // Main Sheet (existing - backward compatible)
  SHEET_ID: "1e1cvseL1_S0Kyr-DFPa-tFsS2rVGZ7qqvBku51jhmbE",
  SHEET_NAME: "Pontos não SEP",

  // Layer Definitions
  LAYERS: {
    main: {
      sheetId: "1e1cvseL1_S0Kyr-DFPa-tFsS2rVGZ7qqvBku51jhmbE",
      tabName: "Pontos não SEP",
      displayName: "Ativos Principais",
      joinKey: "Nº Eletro",
      secondaryJoinKey: "Nº Parada",
      cacheDuration: 300,
      isDefault: true,
    },
    panels: {
      sheetId: "19aG4aS4iH42vbVwi6JJ9aKuhYQmXQ2fMcOSRWl7ochY",
      tabName: "Pontos não SEP ", // Note: trailing space in actual sheet name
      displayName: "Painéis",
      joinKey: "Nº Eletro",
      secondaryJoinKey: "Nº Parada",
      cacheDuration: 600,
      excludeColumns: ["Nº PARADA NOVO"], // Columns to ignore during fetch
      fields: [
        "Nº Eletro",
        "Nº Parada",
        "Modelo de Abrigo",
        "QTDE. CAIXA DIGITAL",
        "FACE DIGITAL",
        "DIGITAL  POSIÇÃO",
        "DIGITAL TIPO",
        "TIPO DE PAINEL DIGITAL",
        "QTDE. CAIXA ESTATICA",
        " FACE ESTATICA",
        "ESTATICO POSIÇÃO",
        "ESTATICO  TIPOS",
        "OBSERVAÇÃO",
      ],
    },
    abrigoamigo: {
      sheetId: "1p6V16c0iZDAgL-zrlHjlfH4FwuucvbEf9miVylfhWVE",
      tabName: "ABRIGO AMIGO",
      displayName: "Abrigo Amigo",
      description:
        "Women's safety initiative - interactive safety hubs at bus stops (8PM-5AM)",
      joinKey: "Nº PARADA",
      cacheDuration: 600,
      fields: ["Nº PARADA", "CLIENTE"],
      excludeColumns: ["ENDEREÇO", "MODELO ABRIGO"],
    },
  },

  // Caching
  CACHE_DURATION_SECONDS: 300, // 5 minutes for full data cache
  SEARCH_CACHE_DURATION: 120, // 2 minutes for search results
  LAYER_CACHE_DURATION: 600, // 10 minutes for secondary layers

  // Limits
  MAX_LIMIT: 5000, // Maximum records per request
  DEFAULT_LIMIT: 1000, // Default records if not specified
  SEARCH_LIMIT: 100, // Max search results

  // Rate Limiting
  RATE_LIMIT_REQUESTS: 100, // Max requests per minute
  RATE_LIMIT_WINDOW: 60000, // 1 minute in ms
};

function doGet(e) {
  var startTime = new Date().getTime();
  try {
    return handleRequest(e, startTime);
  } catch (err) {
    return createError(err.toString(), startTime);
  }
}

function handleRequest(e, startTime) {
  // Check for meta introspection request
  if (e.parameter && e.parameter.meta) {
    return handleMetaRequest(e.parameter.meta, startTime);
  }

  // Check if this is an API request or documentation request
  var hasApiParams =
    e.parameter &&
    (e.parameter.start !== undefined ||
      e.parameter.limit !== undefined ||
      e.parameter.q !== undefined ||
      e.parameter.nparada !== undefined ||
      e.parameter.neletro !== undefined ||
      e.parameter.endereco !== undefined ||
      e.parameter.after !== undefined ||
      e.parameter.status !== undefined ||
      e.parameter.cidade !== undefined ||
      e.parameter.estado !== undefined ||
      e.parameter.bairro !== undefined ||
      e.parameter.area !== undefined ||
      e.parameter.lat !== undefined ||
      e.parameter.fields !== undefined ||
      e.parameter.nocache !== undefined ||
      e.parameter.layer !== undefined ||
      e.parameter.hasDigital !== undefined ||
      e.parameter.hasStatic !== undefined ||
      e.parameter.modelo !== undefined ||
      e.parameter.abrigoAmigo !== undefined ||
      e.parameter.cliente !== undefined);

  // If no API params, serve the documentation HTML page
  if (!hasApiParams && (!e.parameter || e.parameter.docs !== "false")) {
    return serveDocumentationPage();
  }

  // Check for markdown docs request
  if (e.parameter && e.parameter.docs === "true") {
    return returnDocumentation();
  }

  // Parse all parameters
  var params = parseParameters(e);

  // Check rate limiting (lightweight check using cache)
  var rateLimitResult = checkRateLimit();
  if (rateLimitResult.limited) {
    return createRateLimitError(rateLimitResult.retryAfter, startTime);
  }

  // Get data based on layer selection
  var result = getDataWithLayers(params);

  // Create response with rich metadata
  return createSuccessResponse(result, params, startTime);
}

// ---------------------------------------------------------------------------
// PARAMETER PARSING
// ---------------------------------------------------------------------------

function parseParameters(e) {
  var p = e.parameter || {};

  return {
    // Pagination
    start: p.start ? parseInt(p.start) : 0,
    limit: Math.min(
      p.limit ? parseInt(p.limit) : CONFIG.DEFAULT_LIMIT,
      CONFIG.MAX_LIMIT,
    ),
    after: p.after || null, // Cursor-based pagination

    // Layer selection (default: main for backward compatibility)
    layer: p.layer || "main",

    // Search
    q: p.q || null,

    // Key identifier searches (Nº Parada, Nº Eletro, Endereço)
    nparada: p.nparada || null,
    neletro: p.neletro || null,
    endereco: p.endereco || null,

    // Field filters
    filters: {
      status: p.status || null,
      cidade: p.cidade || null,
      estado: p.estado || null,
      bairro: p.bairro || null,
      area: p.area || null,
      praca: p.praca || null,
      filial: p.filial || null,
    },

    // Panel-specific filters (for layer=full or layer=panels)
    panelFilters: {
      hasDigital:
        p.hasDigital === "true"
          ? true
          : p.hasDigital === "false"
            ? false
            : null,
      hasStatic:
        p.hasStatic === "true" ? true : p.hasStatic === "false" ? false : null,
      modelo: p.modelo || null,
    },

    // Abrigo Amigo filters (for layer=full or layer=abrigoamigo)
    abrigoAmigoFilters: {
      hasAbrigoAmigo:
        p.abrigoAmigo === "true"
          ? true
          : p.abrigoAmigo === "false"
            ? false
            : null,
      cliente: p.cliente || null,
    },

    // Geospatial (optional)
    geo:
      p.lat && p.lon
        ? {
            lat: parseFloat(p.lat),
            lon: parseFloat(p.lon),
            radius: p.radius ? parseFloat(p.radius) : 5, // Default 5km
          }
        : null,

    // Sparse fieldsets
    fields: p.fields
      ? p.fields.split(",").map(function (f) {
          return f.trim();
        })
      : null,

    // Cache control
    noCache: p.nocache === "true",
  };
}

// ---------------------------------------------------------------------------
// DATA RETRIEVAL WITH CACHING
// ---------------------------------------------------------------------------

function getDataWithLayers(params) {
  var layer = params.layer;

  // Validate layer
  var validLayers = ["main", "panels", "abrigoamigo", "full", "summary"];
  if (validLayers.indexOf(layer) === -1) {
    throw new Error(
      "Unknown layer: " + layer + ". Valid layers: " + validLayers.join(", "),
    );
  }

  switch (layer) {
    case "main":
      // Default behavior - main sheet only (backward compatible)
      return getData(params);

    case "panels":
      // Panels data only
      return getPanelsData(params);

    case "abrigoamigo":
      // Abrigo Amigo data only
      return getAbrigoAmigoData(params);

    case "full":
      // Main data merged with panels and abrigo amigo
      return getFullData(params);

    case "summary":
      // Main data with panel counts summary
      return getSummaryData(params);

    default:
      return getData(params);
  }
}

function getData(params) {
  var cache = CacheService.getScriptCache();

  // Build cache key based on parameters
  var cacheKey = buildCacheKey(params);
  var isCached = false;
  var cacheExpires = null;

  // Try to get from cache first (unless noCache is set)
  if (!params.noCache) {
    var cachedData = cache.get(cacheKey);
    if (cachedData) {
      try {
        var parsed = JSON.parse(cachedData);
        return {
          data: parsed.data,
          total: parsed.total,
          cached: true,
          cacheExpires: parsed.expires,
        };
      } catch (e) {
        // Cache corrupted, will fetch fresh
      }
    }
  }

  // Fetch fresh data from Google Sheets
  var sheetData = fetchSheetData(params);

  // Cache the results
  var cacheDuration = params.q
    ? CONFIG.SEARCH_CACHE_DURATION
    : CONFIG.CACHE_DURATION_SECONDS;
  var expiresAt = new Date(
    new Date().getTime() + cacheDuration * 1000,
  ).toISOString();

  try {
    // Only cache if data is not too large (100KB limit per cache entry)
    var dataToCache = JSON.stringify({
      data: sheetData.data,
      total: sheetData.total,
      expires: expiresAt,
    });
    if (dataToCache.length < 100000) {
      cache.put(cacheKey, dataToCache, cacheDuration);
    }
  } catch (e) {
    // Cache write failed (data too large), continue without caching
  }

  return {
    data: sheetData.data,
    total: sheetData.total,
    cached: false,
    cacheExpires: expiresAt,
  };
}

function buildCacheKey(params) {
  var keyParts = [
    "v5",
    params.layer || "main",
    params.start,
    params.limit,
    params.q || "",
    params.after || "",
    params.nparada || "",
    params.neletro || "",
    params.endereco || "",
  ];

  // Add filters to key
  for (var key in params.filters) {
    if (params.filters[key]) {
      keyParts.push(key + ":" + params.filters[key]);
    }
  }

  // Add panel filters to key
  if (params.panelFilters) {
    if (params.panelFilters.hasDigital !== null)
      keyParts.push("hd:" + params.panelFilters.hasDigital);
    if (params.panelFilters.hasStatic !== null)
      keyParts.push("hs:" + params.panelFilters.hasStatic);
    if (params.panelFilters.modelo)
      keyParts.push("mod:" + params.panelFilters.modelo);
  }

  // Add Abrigo Amigo filters to key
  if (params.abrigoAmigoFilters) {
    if (params.abrigoAmigoFilters.hasAbrigoAmigo !== null)
      keyParts.push("aa:" + params.abrigoAmigoFilters.hasAbrigoAmigo);
    if (params.abrigoAmigoFilters.cliente)
      keyParts.push("aac:" + params.abrigoAmigoFilters.cliente);
  }

  // Add geo params
  if (params.geo) {
    keyParts.push(
      "geo:" + params.geo.lat + "," + params.geo.lon + "," + params.geo.radius,
    );
  }

  // Add fields
  if (params.fields) {
    keyParts.push("f:" + params.fields.join(","));
  }

  // Create a hash-like key (MD5 not available, so use simple join)
  return keyParts.join("|").substring(0, 250); // Cache key limit
}

// ---------------------------------------------------------------------------
// SHEET DATA FETCHING (Optimized)
// ---------------------------------------------------------------------------

function fetchSheetData(params) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    throw new Error("Sheet not found: " + CONFIG.SHEET_NAME);
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var totalRecords = lastRow - 1; // Exclude header

  // Fetch headers first (from row 1)
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // Find important column indices
  var colIndices = {
    photo: headers.indexOf("Foto Referência"),
    ops: headers.indexOf("Link Operações"),
    eletro: headers.indexOf("Nº Eletro"),
    parada: headers.indexOf("Nº Parada"),
    endereco: headers.indexOf("Endereço"),
    status: headers.indexOf("Status"),
    cidade: headers.indexOf("Cidade"),
    estado: headers.indexOf("Estado"),
    bairro: headers.indexOf("Bairro"),
    area: headers.indexOf("Área de Trabalho"),
    praca: headers.indexOf("Praça"),
    filial: headers.indexOf("Filial"),
    lat: headers.indexOf("Latitude"),
    lon: headers.indexOf("Longitude"),
  };

  var resultRows = [];
  var matchedTotal = 0;

  // --- STRATEGY A: KEY IDENTIFIER SEARCH (nparada, neletro, endereco) ---
  if (params.nparada || params.neletro || params.endereco) {
    var keySearchResult = performKeyIdentifierSearch(
      sheet,
      params,
      headers,
      colIndices,
      lastCol,
      lastRow,
    );
    resultRows = keySearchResult.rows;
    matchedTotal = keySearchResult.total;
  }
  // --- STRATEGY B: TEXT SEARCH (if 'q' is provided) ---
  else if (params.q && params.q.length > 1) {
    var searchResult = performSearch(
      sheet,
      params,
      headers,
      colIndices,
      lastCol,
    );
    resultRows = searchResult.rows;
    matchedTotal = searchResult.total;
  }
  // --- STRATEGY C: CURSOR-BASED PAGINATION (if 'after' is provided) ---
  else if (params.after) {
    var cursorResult = fetchWithCursor(
      sheet,
      params,
      headers,
      colIndices,
      lastCol,
      lastRow,
    );
    resultRows = cursorResult.rows;
    matchedTotal = cursorResult.total;
  }
  // --- STRATEGY D: FILTERED FETCH (if filters are active) ---
  else if (hasActiveFilters(params)) {
    var filteredResult = fetchFiltered(
      sheet,
      params,
      headers,
      colIndices,
      lastCol,
      lastRow,
    );
    resultRows = filteredResult.rows;
    matchedTotal = filteredResult.total;
  }
  // --- STRATEGY E: CHUNK DOWNLOAD (default - fastest for full data) ---
  else {
    var chunkResult = fetchChunk(
      sheet,
      params,
      headers,
      colIndices,
      lastCol,
      lastRow,
    );
    resultRows = chunkResult.rows;
    matchedTotal = chunkResult.total;
  }

  // Convert rows to JSON objects
  var jsonOutput = rowsToJson(resultRows, headers, params.fields);

  return {
    data: jsonOutput,
    total: matchedTotal,
  };
}

// ---------------------------------------------------------------------------
// SEARCH STRATEGY (TextFinder - Optimized)
// ---------------------------------------------------------------------------

function performSearch(sheet, params, headers, colIndices, lastCol) {
  var finder = sheet.createTextFinder(params.q).matchEntireCell(false);
  var ranges = finder.findAll();

  // Get unique row numbers
  var foundRowIndices = [];
  var seenRows = {};
  var searchLimit = Math.min(ranges.length, CONFIG.SEARCH_LIMIT);

  for (
    var i = 0;
    i < ranges.length && foundRowIndices.length < searchLimit;
    i++
  ) {
    var r = ranges[i].getRow();
    if (r > 1 && !seenRows[r]) {
      seenRows[r] = true;

      // Apply additional filters if present
      if (hasActiveFilters(params)) {
        var rowData = sheet.getRange(r, 1, 1, lastCol).getValues()[0];
        if (matchesFilters(rowData, params, colIndices)) {
          foundRowIndices.push(r);
        }
      } else {
        foundRowIndices.push(r);
      }
    }
  }

  // Batch fetch all matching rows (more efficient than individual fetches)
  var rows = [];
  if (foundRowIndices.length > 0) {
    // Fetch in batches for better performance
    rows = fetchRowsByIndices(sheet, foundRowIndices, colIndices, lastCol);
  }

  return {
    rows: rows,
    total: foundRowIndices.length,
  };
}

// ---------------------------------------------------------------------------
// KEY IDENTIFIER SEARCH (Nº Parada, Nº Eletro, Endereço)
// ---------------------------------------------------------------------------

function performKeyIdentifierSearch(
  sheet,
  params,
  headers,
  colIndices,
  lastCol,
  lastRow,
) {
  var foundRowIndices = [];
  var seenRows = {};
  var searchLimit = CONFIG.SEARCH_LIMIT;

  // Search by Nº Parada
  if (params.nparada && colIndices.parada > -1) {
    var paradaCol = colIndices.parada + 1; // 1-indexed
    var finder = sheet
      .getRange(2, paradaCol, lastRow - 1, 1)
      .createTextFinder(params.nparada)
      .matchEntireCell(false); // Partial match
    var ranges = finder.findAll();

    for (
      var i = 0;
      i < ranges.length && foundRowIndices.length < searchLimit;
      i++
    ) {
      var r = ranges[i].getRow();
      if (r > 1 && !seenRows[r]) {
        seenRows[r] = true;
        foundRowIndices.push(r);
      }
    }
  }

  // Search by Nº Eletro
  if (params.neletro && colIndices.eletro > -1) {
    var eletroCol = colIndices.eletro + 1; // 1-indexed
    var finder = sheet
      .getRange(2, eletroCol, lastRow - 1, 1)
      .createTextFinder(params.neletro)
      .matchEntireCell(false); // Partial match
    var ranges = finder.findAll();

    for (
      var i = 0;
      i < ranges.length && foundRowIndices.length < searchLimit;
      i++
    ) {
      var r = ranges[i].getRow();
      if (r > 1 && !seenRows[r]) {
        seenRows[r] = true;
        foundRowIndices.push(r);
      }
    }
  }

  // Search by Endereço
  if (params.endereco && colIndices.endereco > -1) {
    var enderecoCol = colIndices.endereco + 1; // 1-indexed
    var finder = sheet
      .getRange(2, enderecoCol, lastRow - 1, 1)
      .createTextFinder(params.endereco)
      .matchEntireCell(false); // Partial match
    var ranges = finder.findAll();

    for (
      var i = 0;
      i < ranges.length && foundRowIndices.length < searchLimit;
      i++
    ) {
      var r = ranges[i].getRow();
      if (r > 1 && !seenRows[r]) {
        seenRows[r] = true;
        foundRowIndices.push(r);
      }
    }
  }

  // Apply additional filters if present
  if (hasActiveFilters(params) && foundRowIndices.length > 0) {
    var filteredIndices = [];
    for (var i = 0; i < foundRowIndices.length; i++) {
      var rowData = sheet
        .getRange(foundRowIndices[i], 1, 1, lastCol)
        .getValues()[0];
      if (matchesFilters(rowData, params, colIndices)) {
        filteredIndices.push(foundRowIndices[i]);
      }
    }
    foundRowIndices = filteredIndices;
  }

  // Batch fetch all matching rows
  var rows = [];
  if (foundRowIndices.length > 0) {
    rows = fetchRowsByIndices(sheet, foundRowIndices, colIndices, lastCol);
  }

  return {
    rows: rows,
    total: foundRowIndices.length,
  };
}

// ---------------------------------------------------------------------------
// CURSOR-BASED PAGINATION
// ---------------------------------------------------------------------------

function fetchWithCursor(sheet, params, headers, colIndices, lastCol, lastRow) {
  // Find the row with the cursor value (Nº Eletro)
  var eletroCol = colIndices.eletro + 1; // 1-indexed for Sheets
  var finder = sheet
    .getRange(2, eletroCol, lastRow - 1, 1)
    .createTextFinder(params.after)
    .matchEntireCell(true);
  var cursorRange = finder.findNext();

  var startRow = 2; // Default to first data row
  if (cursorRange) {
    startRow = cursorRange.getRow() + 1; // Start after cursor
  }

  var availableRows = lastRow - startRow + 1;
  if (availableRows <= 0) {
    return { rows: [], total: lastRow - 1 };
  }

  var rowsToFetch = Math.min(params.limit, availableRows);

  // Fetch data block
  var dataRange = sheet.getRange(startRow, 1, rowsToFetch, lastCol);
  var rows = dataRange.getValues();

  // Handle RichText links
  rows = enhanceWithLinks(sheet, rows, startRow, rowsToFetch, colIndices);

  return {
    rows: rows,
    total: lastRow - 1,
  };
}

// ---------------------------------------------------------------------------
// FILTERED FETCH
// ---------------------------------------------------------------------------

function fetchFiltered(sheet, params, headers, colIndices, lastCol, lastRow) {
  // For filtered queries, we need to scan all data
  // Fetch in large chunks and filter in memory (more efficient than row-by-row)

  var allRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var matchingRows = [];

  for (var i = 0; i < allRows.length; i++) {
    if (matchesFilters(allRows[i], params, colIndices)) {
      // Geo filter if applicable
      if (params.geo) {
        var rowLat = allRows[i][colIndices.lat];
        var rowLon = allRows[i][colIndices.lon];
        if (rowLat && rowLon) {
          var distance = calculateDistance(
            params.geo.lat,
            params.geo.lon,
            rowLat,
            rowLon,
          );
          if (distance <= params.geo.radius) {
            matchingRows.push(allRows[i]);
          }
        }
      } else {
        matchingRows.push(allRows[i]);
      }
    }
  }

  var totalMatches = matchingRows.length;

  // Apply pagination
  var startIdx = params.start;
  var endIdx = Math.min(startIdx + params.limit, matchingRows.length);
  var paginatedRows = matchingRows.slice(startIdx, endIdx);

  // Note: For filtered results, we can't easily get RichText links without individual cell access
  // This is a tradeoff for performance

  return {
    rows: paginatedRows,
    total: totalMatches,
  };
}

// ---------------------------------------------------------------------------
// CHUNK DOWNLOAD (Default - Fastest for full payload)
// ---------------------------------------------------------------------------

function fetchChunk(sheet, params, headers, colIndices, lastCol, lastRow) {
  var startRow = 2 + params.start;
  var availableRows = lastRow - startRow + 1;

  if (availableRows <= 0) {
    return { rows: [], total: lastRow - 1 };
  }

  var rowsToFetch = Math.min(params.limit, availableRows);

  // Single batch fetch for maximum performance
  var dataRange = sheet.getRange(startRow, 1, rowsToFetch, lastCol);
  var rows = dataRange.getValues();

  // Handle RichText links (batch fetch for link columns)
  rows = enhanceWithLinks(sheet, rows, startRow, rowsToFetch, colIndices);

  return {
    rows: rows,
    total: lastRow - 1,
  };
}

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------------------------

function hasActiveFilters(params) {
  for (var key in params.filters) {
    if (params.filters[key]) return true;
  }
  return params.geo !== null;
}

function matchesFilters(row, params, colIndices) {
  var filters = params.filters;

  if (filters.status && row[colIndices.status] !== filters.status) return false;
  if (filters.cidade && row[colIndices.cidade] !== filters.cidade) return false;
  if (filters.estado && row[colIndices.estado] !== filters.estado) return false;
  if (filters.bairro && row[colIndices.bairro] !== filters.bairro) return false;
  if (filters.area && row[colIndices.area] !== filters.area) return false;
  if (filters.praca && row[colIndices.praca] !== filters.praca) return false;
  if (filters.filial && row[colIndices.filial] !== filters.filial) return false;

  return true;
}

function fetchRowsByIndices(sheet, indices, colIndices, lastCol) {
  var rows = [];

  // Batch fetch optimization: group consecutive indices
  for (var i = 0; i < indices.length; i++) {
    var rowIdx = indices[i];
    var rowData = sheet.getRange(rowIdx, 1, 1, lastCol).getValues()[0];

    // Get RichText links for this row
    if (colIndices.photo > -1) {
      var rich = sheet
        .getRange(rowIdx, colIndices.photo + 1)
        .getRichTextValue();
      if (rich && rich.getLinkUrl()) {
        rowData[colIndices.photo] = rich.getLinkUrl();
      }
    }
    if (colIndices.ops > -1) {
      var rich = sheet.getRange(rowIdx, colIndices.ops + 1).getRichTextValue();
      if (rich && rich.getLinkUrl()) {
        rowData[colIndices.ops] = rich.getLinkUrl();
      }
    }

    rows.push(rowData);
  }

  return rows;
}

function enhanceWithLinks(sheet, rows, startRow, rowCount, colIndices) {
  // Batch fetch RichText for link columns
  var photoRichText = null;
  var opsRichText = null;

  if (colIndices.photo > -1) {
    photoRichText = sheet
      .getRange(startRow, colIndices.photo + 1, rowCount, 1)
      .getRichTextValues();
  }
  if (colIndices.ops > -1) {
    opsRichText = sheet
      .getRange(startRow, colIndices.ops + 1, rowCount, 1)
      .getRichTextValues();
  }

  return rows.map(function (row, idx) {
    if (photoRichText && photoRichText[idx][0]) {
      var url = photoRichText[idx][0].getLinkUrl();
      if (url) row[colIndices.photo] = url;
    }
    if (opsRichText && opsRichText[idx][0]) {
      var url = opsRichText[idx][0].getLinkUrl();
      if (url) row[colIndices.ops] = url;
    }
    return row;
  });
}

function rowsToJson(rows, headers, selectedFields) {
  return rows.map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) {
      var fieldName = h.toString().trim();
      // Only include selected fields if specified
      if (!selectedFields || selectedFields.indexOf(fieldName) > -1) {
        obj[fieldName] = row[i];
      }
    });
    return obj;
  });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Haversine formula for distance in km
  var R = 6371; // Earth's radius in km
  var dLat = ((lat2 - lat1) * Math.PI) / 180;
  var dLon = ((lon2 - lon1) * Math.PI) / 180;
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------------------------------------------------------------------
// PANELS LAYER FUNCTIONS
// ---------------------------------------------------------------------------

// Helper: Normalize header string for fuzzy matching
function normalizeHeader(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[ºª°]/g, "o") // Normalize ordinal indicators
    .replace(/\s+/g, " ") // Normalize whitespace to single space
    .trim();
}

// Helper: Find column index with fuzzy matching
function findColumnIndex(headers, targetName) {
  // Try exact match first
  var idx = headers.indexOf(targetName);
  if (idx > -1) return idx;

  // Normalize and try again
  var normalizedTarget = normalizeHeader(targetName);
  for (var i = 0; i < headers.length; i++) {
    if (normalizeHeader(headers[i]) === normalizedTarget) {
      return i;
    }
  }

  // Try partial match (contains)
  for (var i = 0; i < headers.length; i++) {
    var normalizedHeader = normalizeHeader(headers[i]);
    if (
      normalizedHeader.indexOf(normalizedTarget) > -1 ||
      normalizedTarget.indexOf(normalizedHeader) > -1
    ) {
      return i;
    }
  }

  return -1;
}

// Helper: Get column value with fuzzy key matching
function getColumnValue(row, headers, colMap, targetName) {
  // Try exact match first
  if (colMap[targetName] !== undefined) {
    return row[colMap[targetName]];
  }

  // Try fuzzy match
  var idx = findColumnIndex(headers, targetName);
  if (idx > -1) {
    return row[idx];
  }

  return null;
}

function fetchPanelsIndex() {
  var cache = CacheService.getScriptCache();
  var cacheKey = "panels_index_v3"; // Bumped version to bypass old cache
  var layer = CONFIG.LAYERS.panels;
  var debugInfo = {
    cacheHit: false,
    sheetFound: false,
    headersCount: 0,
    rowsCount: 0,
    joinKeyIndex: -1,
    joinKeyName: layer.joinKey,
    indexedCount: 0,
    errors: [],
    sampleHeaders: [],
    sampleKeys: [],
  };

  // Check cache first
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      var parsed = JSON.parse(cached);
      if (
        parsed &&
        typeof parsed === "object" &&
        Object.keys(parsed).length > 0
      ) {
        debugInfo.cacheHit = true;
        Logger.log(
          "PANELS DEBUG: Cache hit with " +
            Object.keys(parsed).length +
            " entries",
        );
        return parsed;
      }
    } catch (e) {
      debugInfo.errors.push("Cache parse error: " + e.toString());
    }
  }

  // Fetch from sheet
  var ss, sheet;
  try {
    ss = SpreadsheetApp.openById(layer.sheetId);
    sheet = ss.getSheetByName(layer.tabName);
  } catch (e) {
    debugInfo.errors.push("Sheet access error: " + e.toString());
    Logger.log("PANELS DEBUG ERROR: " + e.toString());
    return {};
  }

  if (!sheet) {
    debugInfo.errors.push("Sheet not found: " + layer.tabName);
    Logger.log("PANELS DEBUG: Sheet not found: " + layer.tabName);

    // Try to list available sheets for debugging
    try {
      var availableSheets = ss.getSheets().map(function (s) {
        return s.getName();
      });
      Logger.log(
        "PANELS DEBUG: Available sheets: " + JSON.stringify(availableSheets),
      );
      debugInfo.errors.push("Available sheets: " + availableSheets.join(", "));
    } catch (e) {}

    return {};
  }

  debugInfo.sheetFound = true;
  Logger.log("PANELS DEBUG: Sheet found: " + layer.tabName);

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);

  debugInfo.headersCount = headers.length;
  debugInfo.rowsCount = rows.length;
  debugInfo.sampleHeaders = headers.slice(0, 10).map(function (h) {
    return String(h).substring(0, 30);
  });

  Logger.log("PANELS DEBUG: Headers count: " + headers.length);
  Logger.log("PANELS DEBUG: Rows count: " + rows.length);
  Logger.log(
    "PANELS DEBUG: First 5 headers: " + JSON.stringify(headers.slice(0, 5)),
  );

  // Get list of columns to exclude
  var excludeColumns = layer.excludeColumns || [];

  // Build column map with exact names
  var colMap = {};
  headers.forEach(function (h, i) {
    var fieldName = h.toString().trim();
    colMap[fieldName] = i;
  });

  // Find join key index using fuzzy matching
  var joinKeyIdx = findColumnIndex(headers, layer.joinKey);
  debugInfo.joinKeyIndex = joinKeyIdx;

  Logger.log(
    "PANELS DEBUG: Join key '" +
      layer.joinKey +
      "' found at index: " +
      joinKeyIdx,
  );

  if (joinKeyIdx === -1) {
    debugInfo.errors.push("Join key not found: " + layer.joinKey);
    Logger.log("PANELS DEBUG ERROR: Join key not found!");
    Logger.log("PANELS DEBUG: All headers: " + JSON.stringify(headers));
    return {};
  }

  // Build index
  var index = {};
  var processedCount = 0;
  var skippedCount = 0;

  rows.forEach(function (row, rowIndex) {
    var key = String(row[joinKeyIdx] || "").trim();

    if (key && key !== "" && key !== "undefined") {
      // Get column values using helper (with fallback matching)
      var digitalBoxes = parseNumber(
        getColumnValue(row, headers, colMap, "QTDE. CAIXA DIGITAL"),
      );
      var digitalFaces = parseNumber(
        getColumnValue(row, headers, colMap, "FACE DIGITAL"),
      );
      var staticBoxes = parseNumber(
        getColumnValue(row, headers, colMap, "QTDE. CAIXA ESTATICA"),
      );
      var staticFaces = parseNumber(
        getColumnValue(row, headers, colMap, " FACE ESTATICA") ||
          getColumnValue(row, headers, colMap, "FACE ESTATICA"),
      );

      index[key] = {
        digital: {
          boxes: digitalBoxes,
          faces: digitalFaces,
          position:
            getColumnValue(row, headers, colMap, "DIGITAL  POSIÇÃO") ||
            getColumnValue(row, headers, colMap, "DIGITAL POSIÇÃO") ||
            null,
          type: getColumnValue(row, headers, colMap, "DIGITAL TIPO") || null,
          brand:
            getColumnValue(row, headers, colMap, "TIPO DE PAINEL DIGITAL") ||
            null,
        },
        static: {
          boxes: staticBoxes,
          faces: staticFaces,
          position:
            getColumnValue(row, headers, colMap, "ESTATICO POSIÇÃO") ||
            getColumnValue(row, headers, colMap, "ESTATICO  POSIÇÃO") ||
            null,
          type:
            getColumnValue(row, headers, colMap, "ESTATICO  TIPOS") ||
            getColumnValue(row, headers, colMap, "ESTATICO TIPOS") ||
            null,
        },
        shelterModel:
          getColumnValue(row, headers, colMap, "Modelo de Abrigo") || null,
        observation:
          getColumnValue(row, headers, colMap, "OBSERVAÇÃO") ||
          getColumnValue(row, headers, colMap, "OBSERVACAO") ||
          null,
        hasDigital: digitalBoxes > 0 || digitalFaces > 0,
        hasStatic: staticBoxes > 0 || staticFaces > 0,
        totalPanels: (digitalBoxes || 0) + (staticBoxes || 0),
      };
      processedCount++;

      // Capture sample keys for debugging
      if (debugInfo.sampleKeys.length < 5) {
        debugInfo.sampleKeys.push(key);
      }
    } else {
      skippedCount++;
    }
  });

  debugInfo.indexedCount = processedCount;
  Logger.log(
    "PANELS DEBUG: Indexed " +
      processedCount +
      " records, skipped " +
      skippedCount,
  );
  Logger.log(
    "PANELS DEBUG: Sample keys: " + JSON.stringify(debugInfo.sampleKeys),
  );

  // Cache the index
  try {
    var cacheData = JSON.stringify(index);
    Logger.log("PANELS DEBUG: Cache data size: " + cacheData.length + " bytes");
    if (cacheData.length < 100000) {
      cache.put(
        cacheKey,
        cacheData,
        layer.cacheDuration || CONFIG.LAYER_CACHE_DURATION,
      );
      Logger.log("PANELS DEBUG: Successfully cached");
    } else {
      Logger.log("PANELS DEBUG: Data too large to cache");
    }
  } catch (e) {
    Logger.log("PANELS DEBUG: Failed to cache panels index: " + e.toString());
  }

  // Store debug info in cache for retrieval via meta endpoint
  try {
    cache.put("panels_debug_info", JSON.stringify(debugInfo), 300);
  } catch (e) {}

  return index;
}

function parseNumber(val) {
  if (val === null || val === undefined || val === "") return 0;
  var num = parseFloat(String(val).replace(",", "."));
  return isNaN(num) ? 0 : num;
}

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS FOR ROBUST COLUMN MATCHING
// ---------------------------------------------------------------------------

function normalizeHeader(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[ºª°]/g, "o") // Normalize ordinal indicators
    .replace(/\s+/g, " ") // Normalize whitespace to single space
    .trim();
}

function findColumnIndex(headers, targetName) {
  // Try exact match first
  var idx = headers.indexOf(targetName);
  if (idx > -1) return idx;

  // Normalize and try again
  var normalizedTarget = normalizeHeader(targetName);
  for (var i = 0; i < headers.length; i++) {
    if (normalizeHeader(headers[i]) === normalizedTarget) {
      return i;
    }
  }

  // Try partial match (contains)
  for (var i = 0; i < headers.length; i++) {
    var normalizedHeader = normalizeHeader(headers[i]);
    if (
      normalizedHeader.indexOf(normalizedTarget) > -1 ||
      normalizedTarget.indexOf(normalizedHeader) > -1
    ) {
      return i;
    }
  }

  return -1;
}

function buildColumnMap(headers, excludeColumns) {
  var colMap = {};
  var excludeNormalized = (excludeColumns || []).map(normalizeHeader);

  headers.forEach(function (h, i) {
    var fieldName = h.toString().trim();
    var normalizedName = normalizeHeader(fieldName);

    // Skip excluded columns
    var isExcluded = excludeNormalized.some(function (excl) {
      return normalizedName === excl || normalizedName.indexOf(excl) > -1;
    });

    if (!isExcluded) {
      colMap[fieldName] = i;
    }
  });

  return colMap;
}

function getPanelsData(params) {
  var panelsIndex = fetchPanelsIndex();
  var allPanels = [];

  for (var key in panelsIndex) {
    var panelData = panelsIndex[key];
    panelData["Nº Eletro"] = key;

    // Apply panel filters
    if (matchesPanelFilters(panelData, params.panelFilters)) {
      allPanels.push(panelData);
    }
  }

  // Apply pagination
  var total = allPanels.length;
  var paginatedData = allPanels.slice(
    params.start,
    params.start + params.limit,
  );

  return {
    data: paginatedData,
    total: total,
    cached: false,
    cacheExpires: new Date(
      new Date().getTime() + CONFIG.LAYER_CACHE_DURATION * 1000,
    ).toISOString(),
  };
}

function getFullData(params) {
  // Get main data first
  var mainResult = getData(params);

  // Get panels index
  var panelsIndex = fetchPanelsIndex();

  // Get Abrigo Amigo index
  var abrigoAmigoIndex = fetchAbrigoAmigoIndex();

  // Merge panels and abrigo amigo data into main data
  var mergedData = mainResult.data.map(function (record) {
    var eletroKey = record["Nº Eletro"];
    var paradaKey = String(record["Nº Parada"] || "").trim();
    var paradaBase = paradaKey.split("-")[0];

    // Panels (by Nº Eletro)
    record.panels = panelsIndex[eletroKey] || null;

    // Abrigo Amigo (by Nº Parada - try full key first, then base)
    var abrigoData =
      abrigoAmigoIndex[paradaKey] || abrigoAmigoIndex[paradaBase] || null;
    record.abrigoAmigo = abrigoData;

    return record;
  });

  // Apply panel filters if specified
  if (hasPanelFilters(params)) {
    mergedData = mergedData.filter(function (record) {
      if (!record.panels) return false;
      return matchesPanelFilters(record.panels, params.panelFilters);
    });
  }

  // Apply Abrigo Amigo filters if specified
  if (hasAbrigoAmigoFilters(params)) {
    mergedData = mergedData.filter(function (record) {
      return matchesAbrigoAmigoFilters(record, params.abrigoAmigoFilters);
    });
  }

  return {
    data: mergedData,
    total: mergedData.length,
    cached: mainResult.cached,
    cacheExpires: mainResult.cacheExpires,
    layer: "full",
  };
}

function getSummaryData(params) {
  // Get main data
  var mainResult = getData(params);

  // Get panels index
  var panelsIndex = fetchPanelsIndex();

  // Get Abrigo Amigo index
  var abrigoAmigoIndex = fetchAbrigoAmigoIndex();

  // Add summary counts to main data
  var summaryData = mainResult.data.map(function (record) {
    var eletroKey = record["Nº Eletro"];
    var paradaKey = String(record["Nº Parada"] || "").trim();
    var paradaBase = paradaKey.split("-")[0];

    // Panel summary
    var panelData = panelsIndex[eletroKey];
    if (panelData) {
      record.digitalPanels = panelData.digital.boxes || 0;
      record.staticPanels = panelData.static.boxes || 0;
      record.totalPanels = panelData.totalPanels || 0;
      record.hasDigital = panelData.hasDigital;
      record.hasStatic = panelData.hasStatic;
      record.shelterModel = panelData.shelterModel;
    } else {
      record.digitalPanels = 0;
      record.staticPanels = 0;
      record.totalPanels = 0;
      record.hasDigital = false;
      record.hasStatic = false;
      record.shelterModel = null;
    }

    // Abrigo Amigo summary
    var abrigoData =
      abrigoAmigoIndex[paradaKey] || abrigoAmigoIndex[paradaBase] || null;
    record.hasAbrigoAmigo = abrigoData !== null && abrigoData !== undefined;
    record.abrigoAmigoCliente = abrigoData ? abrigoData.cliente : null;

    return record;
  });

  // Apply panel filters if specified
  if (hasPanelFilters(params)) {
    summaryData = summaryData.filter(function (record) {
      return matchesPanelFilters(
        {
          hasDigital: record.hasDigital,
          hasStatic: record.hasStatic,
          shelterModel: record.shelterModel,
        },
        params.panelFilters,
      );
    });
  }

  // Apply Abrigo Amigo filters if specified
  if (hasAbrigoAmigoFilters(params)) {
    summaryData = summaryData.filter(function (record) {
      return matchesAbrigoAmigoFilters(
        {
          abrigoAmigo: record.hasAbrigoAmigo
            ? { cliente: record.abrigoAmigoCliente }
            : null,
        },
        params.abrigoAmigoFilters,
      );
    });
  }

  return {
    data: summaryData,
    total: summaryData.length,
    cached: mainResult.cached,
    cacheExpires: mainResult.cacheExpires,
    layer: "summary",
  };
}

function hasPanelFilters(params) {
  if (!params.panelFilters) return false;
  return (
    params.panelFilters.hasDigital !== null ||
    params.panelFilters.hasStatic !== null ||
    params.panelFilters.modelo !== null
  );
}

function matchesPanelFilters(panelData, panelFilters) {
  if (!panelFilters) return true;

  if (
    panelFilters.hasDigital !== null &&
    panelData.hasDigital !== panelFilters.hasDigital
  ) {
    return false;
  }

  if (
    panelFilters.hasStatic !== null &&
    panelData.hasStatic !== panelFilters.hasStatic
  ) {
    return false;
  }

  if (panelFilters.modelo && panelData.shelterModel !== panelFilters.modelo) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// ABRIGO AMIGO LAYER FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Fetches and caches the Abrigo Amigo index.
 * Abrigo Amigo is a women's safety initiative at bus stops (8PM-5AM).
 * @returns {Object} Index keyed by Nº Parada
 */
function fetchAbrigoAmigoIndex() {
  var cache = CacheService.getScriptCache();
  var cacheKey = "abrigoamigo_index_v1";
  var layer = CONFIG.LAYERS.abrigoamigo;

  // Check cache first
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      var parsed = JSON.parse(cached);
      if (
        parsed &&
        typeof parsed === "object" &&
        Object.keys(parsed).length > 0
      ) {
        return parsed;
      }
    } catch (e) {
      /* cache corrupted */
    }
  }

  // Fetch from sheet
  var ss, sheet;
  try {
    ss = SpreadsheetApp.openById(layer.sheetId);
    sheet = ss.getSheetByName(layer.tabName);
  } catch (e) {
    Logger.log("ABRIGO AMIGO: Sheet access error: " + e.toString());
    return {};
  }

  if (!sheet) {
    Logger.log("ABRIGO AMIGO: Sheet not found: " + layer.tabName);
    return {};
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);

  // Find column indices
  var paradaIdx = findColumnIndex(headers, "Nº PARADA");
  var clienteIdx = findColumnIndex(headers, "CLIENTE");

  if (paradaIdx === -1) {
    Logger.log("ABRIGO AMIGO: Join key (Nº PARADA) not found in headers");
    return {};
  }

  // Build index by Nº PARADA
  var index = {};
  var processedCount = 0;

  rows.forEach(function (row) {
    var paradaRaw = String(row[paradaIdx] || "").trim();
    if (!paradaRaw || paradaRaw === "") return;

    // Normalize cliente to title case (Claro, Governo)
    var clienteRaw =
      clienteIdx > -1 ? String(row[clienteIdx] || "").trim() : null;
    var cliente = null;
    if (clienteRaw) {
      cliente =
        clienteRaw.charAt(0).toUpperCase() + clienteRaw.slice(1).toLowerCase();
    }

    var entry = {
      enabled: true,
      cliente: cliente,
      paradaOriginal: paradaRaw,
    };

    // Store by full key (with suffix like -1, -2)
    index[paradaRaw] = entry;

    // Also store by base key (without suffix) for flexible matching
    var paradaBase = paradaRaw.split("-")[0];
    if (paradaBase !== paradaRaw && !index[paradaBase]) {
      index[paradaBase] = entry;
    }

    processedCount++;
  });

  Logger.log("ABRIGO AMIGO: Indexed " + processedCount + " entries");

  // Cache the index
  try {
    var cacheData = JSON.stringify(index);
    if (cacheData.length < 100000) {
      cache.put(cacheKey, cacheData, layer.cacheDuration || 600);
      Logger.log("ABRIGO AMIGO: Successfully cached");
    }
  } catch (e) {
    Logger.log("ABRIGO AMIGO: Cache write failed: " + e.toString());
  }

  return index;
}

/**
 * Gets standalone Abrigo Amigo data (layer=abrigoamigo)
 */
function getAbrigoAmigoData(params) {
  var abrigoIndex = fetchAbrigoAmigoIndex();
  var allEntries = [];

  for (var key in abrigoIndex) {
    var entry = Object.assign({}, abrigoIndex[key]);
    entry["Nº Parada"] = key;

    // Apply filters
    if (
      matchesAbrigoAmigoFilters(
        { abrigoAmigo: entry },
        params.abrigoAmigoFilters,
      )
    ) {
      allEntries.push(entry);
    }
  }

  // Apply pagination
  var total = allEntries.length;
  var paginatedData = allEntries.slice(
    params.start,
    params.start + params.limit,
  );

  return {
    data: paginatedData,
    total: total,
    cached: false,
    cacheExpires: new Date(
      new Date().getTime() + CONFIG.LAYER_CACHE_DURATION * 1000,
    ).toISOString(),
  };
}

/**
 * Checks if Abrigo Amigo filters are active
 */
function hasAbrigoAmigoFilters(params) {
  if (!params.abrigoAmigoFilters) return false;
  return (
    params.abrigoAmigoFilters.hasAbrigoAmigo !== null ||
    params.abrigoAmigoFilters.cliente !== null
  );
}

/**
 * Matches a record against Abrigo Amigo filters
 */
function matchesAbrigoAmigoFilters(record, filters) {
  if (!filters) return true;

  var hasAbrigo =
    record.abrigoAmigo !== null && record.abrigoAmigo !== undefined;

  // Filter by hasAbrigoAmigo
  if (filters.hasAbrigoAmigo === true && !hasAbrigo) return false;
  if (filters.hasAbrigoAmigo === false && hasAbrigo) return false;

  // Filter by cliente (case-insensitive)
  if (filters.cliente && hasAbrigo && record.abrigoAmigo.cliente) {
    var filterCliente = filters.cliente.toLowerCase();
    var recordCliente = record.abrigoAmigo.cliente.toLowerCase();
    if (recordCliente !== filterCliente) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// META INTROSPECTION ENDPOINT
// ---------------------------------------------------------------------------

function handleMetaRequest(metaType, startTime) {
  var response;

  switch (metaType) {
    case "layers":
      response = getLayersMeta();
      break;
    case "version":
      response = getVersionMeta();
      break;
    case "schema":
      response = getSchemaMeta();
      break;
    case "debug":
      response = getPanelsDebugInfo();
      break;
    default:
      throw new Error(
        "Unknown meta type: " +
          metaType +
          ". Valid types: layers, version, schema, debug",
      );
  }

  var executionTime = new Date().getTime() - startTime;
  response.meta = { executionTimeMs: executionTime };

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function getLayersMeta() {
  var layers = [];

  for (var layerId in CONFIG.LAYERS) {
    var layer = CONFIG.LAYERS[layerId];
    layers.push({
      id: layerId,
      name: layer.displayName || layerId,
      description: layer.description || null,
      source: { sheetId: layer.sheetId, tab: layer.tabName },
      joinKey: layer.joinKey,
      secondaryJoinKey: layer.secondaryJoinKey || null,
      cacheDuration: layer.cacheDuration || CONFIG.CACHE_DURATION_SECONDS,
      isDefault: layer.isDefault || false,
    });
  }

  // Add virtual layers
  layers.push({
    id: "full",
    name: "Dados Completos (Main + Panels + Abrigo Amigo)",
    type: "merged",
    merges: ["main", "panels", "abrigoamigo"],
    joinKeys: { panels: "Nº Eletro", abrigoamigo: "Nº Parada" },
  });

  layers.push({
    id: "summary",
    name: "Resumo com Contagem de Painéis e Abrigo Amigo",
    type: "aggregated",
    base: "main",
    enrichedWith: ["panels", "abrigoamigo"],
  });

  return {
    apiVersion: CONFIG.API_VERSION,
    layers: layers,
    defaultLayer: "main",
    availableFilters: {
      main: ["status", "cidade", "estado", "bairro", "area", "praca", "filial"],
      panels: ["hasDigital", "hasStatic", "modelo"],
      abrigoamigo: ["cliente"],
      full: [
        "status",
        "cidade",
        "estado",
        "bairro",
        "area",
        "praca",
        "filial",
        "hasDigital",
        "hasStatic",
        "modelo",
        "abrigoAmigo",
        "cliente",
      ],
      summary: [
        "status",
        "cidade",
        "estado",
        "bairro",
        "area",
        "praca",
        "filial",
        "hasDigital",
        "hasStatic",
        "modelo",
        "abrigoAmigo",
        "cliente",
      ],
    },
  };
}

function getVersionMeta() {
  return {
    apiVersion: CONFIG.API_VERSION,
    lastUpdated: "2025-12-23",
    documentation:
      "https://script.google.com/macros/s/AKfycbzXpzgaA64P147rIqeaLEkCZ4YQcz5rJOn89Ag8Pf3p8EIg0Beisa9dS0OL-UEOsIWL/exec",
    features: [
      "Multi-layer data mesh",
      "Panels enrichment layer",
      "Abrigo Amigo safety initiative layer",
      "Digital panel brand/model data",
      "Meta introspection",
      "Caching (5-10 min)",
      "Geospatial queries",
      "Sparse fieldsets",
      "Rate limiting",
    ],
  };
}

function getSchemaMeta() {
  return {
    apiVersion: CONFIG.API_VERSION,
    layers: {
      main: {
        fields: [
          { name: "Nº Eletro", type: "string", key: true },
          { name: "Nº Parada", type: "number" },
          { name: "Status", type: "string", filterable: true },
          { name: "Cidade", type: "string", filterable: true },
          { name: "Estado", type: "string", filterable: true },
          { name: "Bairro", type: "string", filterable: true },
          { name: "Latitude", type: "number", geo: true },
          { name: "Longitude", type: "number", geo: true },
          { name: "Endereço", type: "string", searchable: true },
        ],
      },
      panels: {
        fields: [
          { name: "digital.boxes", type: "number" },
          { name: "digital.faces", type: "number" },
          { name: "digital.position", type: "string" },
          { name: "digital.type", type: "string" },
          {
            name: "digital.brand",
            type: "string",
            description: "Digital panel brand/model (BOE, CHINA, LG, etc.)",
          },
          { name: "static.boxes", type: "number" },
          { name: "static.faces", type: "number" },
          { name: "static.position", type: "string" },
          { name: "static.type", type: "string" },
          { name: "shelterModel", type: "string", filterable: true },
          { name: "hasDigital", type: "boolean", filterable: true },
          { name: "hasStatic", type: "boolean", filterable: true },
          { name: "totalPanels", type: "number" },
        ],
      },
      abrigoamigo: {
        fields: [
          {
            name: "enabled",
            type: "boolean",
            description: "Has Abrigo Amigo technology",
          },
          {
            name: "cliente",
            type: "string",
            filterable: true,
            description: "Sponsor (Claro, Governo)",
          },
          {
            name: "paradaOriginal",
            type: "string",
            description: "Original Nº Parada from Abrigo Amigo sheet",
          },
        ],
        description:
          "Abrigo Amigo is a women's safety initiative at bus stops (8PM-5AM) with cameras, microphones, and real-time video calls",
      },
    },
    relationships: [
      { from: "main", to: "panels", via: "Nº Eletro", type: "1:1" },
      { from: "main", to: "abrigoamigo", via: "Nº Parada", type: "1:1" },
    ],
  };
}

// ---------------------------------------------------------------------------
// RATE LIMITING
// ---------------------------------------------------------------------------

function getPanelsDebugInfo() {
  var cache = CacheService.getScriptCache();
  var layer = CONFIG.LAYERS.panels;

  // Force fresh fetch to get current debug info
  var debugResult = {
    apiVersion: CONFIG.API_VERSION,
    panelsConfig: {
      sheetId: layer.sheetId,
      tabName: layer.tabName,
      joinKey: layer.joinKey,
      cacheDuration: layer.cacheDuration,
    },
    diagnosis: {
      sheetAccessible: false,
      tabFound: false,
      headersFound: [],
      rowCount: 0,
      joinKeyIndex: -1,
      joinKeyFound: false,
      indexedRecords: 0,
      sampleKeys: [],
      errors: [],
    },
  };

  try {
    // Test sheet access
    var ss = SpreadsheetApp.openById(layer.sheetId);
    debugResult.diagnosis.sheetAccessible = true;

    // List available tabs
    var allTabs = ss.getSheets().map(function (s) {
      return s.getName();
    });
    debugResult.diagnosis.availableTabs = allTabs;

    // Get target sheet
    var sheet = ss.getSheetByName(layer.tabName);
    if (sheet) {
      debugResult.diagnosis.tabFound = true;

      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var rows = data.slice(1);

      debugResult.diagnosis.headersFound = headers.map(function (h, i) {
        return {
          index: i,
          name: String(h).substring(0, 50),
          normalized: normalizeHeader(h),
        };
      });
      debugResult.diagnosis.rowCount = rows.length;

      // Find join key
      var joinKeyIdx = findColumnIndex(headers, layer.joinKey);
      debugResult.diagnosis.joinKeyIndex = joinKeyIdx;
      debugResult.diagnosis.joinKeyFound = joinKeyIdx > -1;

      if (joinKeyIdx > -1) {
        // Count and sample indexed records
        var count = 0;
        var samples = [];
        for (var i = 0; i < rows.length && samples.length < 10; i++) {
          var key = String(rows[i][joinKeyIdx] || "").trim();
          if (key && key !== "" && key !== "undefined") {
            count++;
            if (samples.length < 10) {
              samples.push(key);
            }
          }
        }
        debugResult.diagnosis.indexedRecords = count;
        debugResult.diagnosis.sampleKeys = samples;

        // Sample first record with all values
        if (rows.length > 0) {
          var sampleRow = rows[0];
          debugResult.diagnosis.sampleRecord = {};
          headers.forEach(function (h, i) {
            debugResult.diagnosis.sampleRecord[String(h).substring(0, 30)] =
              String(sampleRow[i] || "").substring(0, 50);
          });
        }
      }
    } else {
      debugResult.diagnosis.errors.push("Tab not found: " + layer.tabName);
    }
  } catch (e) {
    debugResult.diagnosis.errors.push("Error: " + e.toString());
  }

  // Get cached debug info if available
  try {
    var cachedDebug = cache.get("panels_debug_info");
    if (cachedDebug) {
      debugResult.lastFetchDebug = JSON.parse(cachedDebug);
    }
  } catch (e) {}

  // Test the actual fetchPanelsIndex result
  try {
    var panelsIndex = fetchPanelsIndex();
    var keys = Object.keys(panelsIndex);
    debugResult.currentIndex = {
      totalRecords: keys.length,
      sampleKeys: keys.slice(0, 5),
      sampleRecord: keys.length > 0 ? panelsIndex[keys[0]] : null,
    };
  } catch (e) {
    debugResult.currentIndex = { error: e.toString() };
  }

  return debugResult;
}

function checkRateLimit() {
  var cache = CacheService.getScriptCache();
  var key = "rate_limit_counter";

  var current = cache.get(key);
  var count = current ? parseInt(current) : 0;

  if (count >= CONFIG.RATE_LIMIT_REQUESTS) {
    return { limited: true, retryAfter: 60 };
  }

  // Increment counter
  cache.put(key, String(count + 1), CONFIG.RATE_LIMIT_WINDOW / 1000);

  return { limited: false };
}

// ---------------------------------------------------------------------------
// RESPONSE BUILDERS
// ---------------------------------------------------------------------------

function createSuccessResponse(result, params, startTime) {
  var executionTime = new Date().getTime() - startTime;

  // Build pagination links
  var links = buildPaginationLinks(params, result.total, result.data.length);

  var response = {
    status: "success",
    meta: {
      apiVersion: CONFIG.API_VERSION,
      layer: params.layer || "main",
      count: result.data.length,
      total: result.total,
      cached: result.cached,
      cacheExpires: result.cacheExpires,
      executionTimeMs: executionTime,
    },
    links: links,
    // Keep legacy fields for backward compatibility
    count: result.data.length,
    total: result.total,
    data: result.data,
  };

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function buildPaginationLinks(params, total, currentCount) {
  var base = ""; // Web app URL will be relative
  var links = {};

  links.self = "?start=" + params.start + "&limit=" + params.limit;

  // Next link (if there are more results)
  if (params.start + currentCount < total) {
    links.next =
      "?start=" + (params.start + params.limit) + "&limit=" + params.limit;
  }

  // Previous link (if not at start)
  if (params.start > 0) {
    var prevStart = Math.max(0, params.start - params.limit);
    links.prev = "?start=" + prevStart + "&limit=" + params.limit;
  }

  // First and last
  links.first = "?start=0&limit=" + params.limit;
  var lastStart = Math.max(
    0,
    Math.floor((total - 1) / params.limit) * params.limit,
  );
  links.last = "?start=" + lastStart + "&limit=" + params.limit;

  return links;
}

function createError(message, startTime) {
  var executionTime = startTime ? new Date().getTime() - startTime : 0;

  return ContentService.createTextOutput(
    JSON.stringify({
      status: "error",
      message: message,
      meta: {
        executionTimeMs: executionTime,
      },
    }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function createRateLimitError(retryAfter, startTime) {
  var executionTime = new Date().getTime() - startTime;

  return ContentService.createTextOutput(
    JSON.stringify({
      status: "error",
      code: 429,
      message:
        "Too many requests. Please retry after " + retryAfter + " seconds.",
      meta: {
        retryAfter: retryAfter,
        executionTimeMs: executionTime,
      },
    }),
  ).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// DOCUMENTATION ENDPOINT
// ---------------------------------------------------------------------------

function returnDocumentation() {
  var docs = `# API de Ativos - Documentação v5.2.0

## URL Base
\`https://script.google.com/macros/s/AKfycbzXpzgaA64P147rIqeaLEkCZ4YQcz5rJOn89Ag8Pf3p8EIg0Beisa9dS0OL-UEOsIWL/exec\`

## Novidades v5.2.0
- **Abrigo Amigo Layer**: Camada de segurança para mulheres (8PM-5AM)
- **abrigoAmigo**: Filtro para equipamentos com tecnologia Abrigo Amigo
- **cliente**: Filtro por patrocinador (Claro, Governo)

## Camadas de Dados (v5.2)
| layer | Descrição |
|-------|-----------|
| main | Dados principais (padrão) |
| panels | Apenas dados de painéis |
| abrigoamigo | Equipamentos com Abrigo Amigo |
| full | Main + Panels + Abrigo Amigo mesclados |
| summary | Main + contagens de painéis + Abrigo Amigo |

## Introspection
| Parâmetro | Descrição |
|-----------|-----------|
| meta=layers | Lista camadas disponíveis |
| meta=version | Versão da API |
| meta=schema | Schema completo |

## Parâmetros

### Paginação
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| start | int | 0 | Offset inicial |
| limit | int | 1000 | Registros por página (máx: 5000) |
| after | string | - | Cursor (Nº Eletro) |

### Filtros
| Parâmetro | Descrição |
|-----------|-----------|
| q | Busca textual |
| nparada | Buscar por Nº Parada |
| neletro | Buscar por Nº Eletro |
| endereco | Buscar por Endereço |
| status | Filtrar por Status |
| cidade | Filtrar por cidade |
| estado | Filtrar por estado |
| bairro | Filtrar por bairro |
| area | Área de trabalho |
| praca | Praça |
| filial | Filial |

### Filtros de Painéis (v5.0)
| Parâmetro | Descrição |
|-----------|-----------|
| hasDigital | Filtrar com painéis digitais (true/false) |
| hasStatic | Filtrar com painéis estáticos (true/false) |
| modelo | Filtrar por modelo de abrigo |

### Filtros Abrigo Amigo (v5.2.0)
| Parâmetro | Descrição |
|-----------|-----------|
| abrigoAmigo | Filtrar equipamentos com Abrigo Amigo (true/false) |
| cliente | Filtrar por patrocinador (Claro, Governo) |

### Geoespacial
| Parâmetro | Descrição |
|-----------|-----------|
| lat | Latitude |
| lon | Longitude |
| radius | Raio em km (padrão: 5) |

### Outros
| Parâmetro | Descrição |
|-----------|-----------|
| layer | Camada de dados (main/panels/abrigoamigo/full/summary) |
| fields | Campos separados por vírgula |
| nocache | Ignorar cache (true/false) |
| docs | Retornar documentação (true) |

## Campos de Painéis (v5.1.0)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| digital.boxes | number | Qtde caixas digitais |
| digital.faces | number | Qtde faces digitais |
| digital.position | string | Posição (45°, 90°, 180°) |
| digital.type | string | Tipo de montagem (SIMPLES) |
| digital.brand | string | Marca/modelo (BOE, CHINA, LG) |
| static.boxes | number | Qtde caixas estáticas |
| static.faces | number | Qtde faces estáticas |
| static.position | string | Posição |
| static.type | string | Tipo (SIMPLES, SUSPENSO, DUPLA FACE) |

## Campos Abrigo Amigo (v5.2.0)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| abrigoAmigo.enabled | boolean | Possui tecnologia Abrigo Amigo |
| abrigoAmigo.cliente | string | Patrocinador (Claro, Governo) |
| hasAbrigoAmigo | boolean | Flag de resumo (layer=summary) |

## Exemplo de Resposta
\`\`\`json
{
  "status": "success",
  "meta": { "apiVersion": "5.2.0", "layer": "main", "count": 1000, "total": 22038, "cached": true },
  "data": [...]
}
\`\`\`

## Rate Limit
100 requisições por minuto. Resposta 429 quando excedido.
`;

  return ContentService.createTextOutput(docs).setMimeType(
    ContentService.MimeType.TEXT,
  );
}

// ---------------------------------------------------------------------------
// SERVE HTML DOCUMENTATION PAGE
// ---------------------------------------------------------------------------

function serveDocumentationPage() {
  var html =
    `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API de Ativos - Documentação | Eletromidia</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Rethink+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet">
  <style>
    :root{--orange:#FF4F00;--black:#000;--white:#FFF;--cream:#F9F2E7;--purple:#4E18FF;--yellow:#FECC14;--green:#3D7700;--gray-200:#e5e5e5;--gray-600:#666;--radius:12px}
    *{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
    body{font-family:'Rethink Sans',system-ui,sans-serif;background:var(--white);color:var(--black);line-height:1.6}
    .header{background:var(--orange);padding:16px 32px;position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between}
    .header h1{font-size:24px;font-weight:700}.header .badge{background:var(--black);color:var(--white);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
    .container{display:grid;grid-template-columns:260px 1fr;min-height:calc(100vh - 60px)}
    .sidebar{background:var(--cream);padding:24px;position:sticky;top:60px;height:calc(100vh - 60px);overflow-y:auto;border-right:1px solid var(--gray-200)}
    .sidebar h3{font-size:12px;text-transform:uppercase;color:var(--gray-600);margin-bottom:12px}.sidebar ul{list-style:none}
    .sidebar a{display:block;padding:10px 16px;color:var(--black);text-decoration:none;border-radius:var(--radius);margin-bottom:4px;font-weight:500;transition:all .2s}
    .sidebar a:hover,.sidebar a.active{background:var(--orange)}
    .main{padding:48px 64px;max-width:900px}section{margin-bottom:64px;scroll-margin-top:80px}
    h2{font-size:36px;font-weight:700;margin-bottom:24px;padding-bottom:12px;border-bottom:3px solid var(--orange)}
    h3{font-size:24px;font-weight:600;margin:32px 0 16px}p{margin-bottom:16px}
    .card{background:var(--white);border:1px solid var(--gray-200);border-radius:20px;padding:24px;margin:16px 0;box-shadow:0 2px 8px rgba(0,0,0,.05)}
    .card.highlight{background:linear-gradient(135deg,var(--cream) 0%,var(--white) 100%);border-left:4px solid var(--orange)}
    table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}
    th,td{padding:12px 16px;text-align:left;border-bottom:1px solid var(--gray-200)}
    th{background:var(--black);color:var(--white);font-weight:600}tr:hover td{background:var(--cream)}
    .code-tabs{margin:24px 0;border-radius:20px;overflow:hidden;border:1px solid var(--gray-200)}
    .tab-buttons{display:flex;background:var(--black);overflow-x:auto}
    .tab-btn{padding:12px 20px;background:transparent;border:none;color:var(--gray-200);cursor:pointer;font-family:inherit;font-size:14px;font-weight:500;white-space:nowrap;transition:all .2s}
    .tab-btn:hover{color:var(--white)}.tab-btn.active{background:var(--purple);color:var(--white)}
    .tab-content{display:none}.tab-content.active{display:block}
    pre{margin:0!important;border-radius:0!important;font-size:13px!important}
    .code-header{display:flex;justify-content:space-between;align-items:center;padding:8px 16px;background:#1a1a2e;border-bottom:1px solid #333}
    .code-lang{color:var(--yellow);font-size:12px;font-weight:600}
    .copy-btn{background:var(--purple);color:var(--white);border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px}
    code:not([class*="language-"]){background:var(--cream);padding:2px 8px;border-radius:4px;font-size:14px;color:var(--purple)}
    .url-box{background:var(--black);color:var(--white);padding:16px 24px;border-radius:var(--radius);font-family:monospace;font-size:14px;word-break:break-all;margin:16px 0}
    .alert{padding:16px 20px;border-radius:var(--radius);margin:16px 0;display:flex;gap:12px}
    .alert-info{background:#e8f4fd;border-left:4px solid var(--purple)}
    .alert-warning{background:#fff8e6;border-left:4px solid var(--yellow)}
    @media(max-width:900px){.container{grid-template-columns:1fr}.sidebar{position:static;height:auto}.sidebar ul{display:flex;flex-wrap:wrap;gap:8px}.main{padding:32px 24px}}
  </style>
</head>
<body>
  <header class="header"><h1>API de Ativos</h1><span class="badge">v5.2.0 Multi-Layer</span></header>
  <div class="container">
    <nav class="sidebar">
      <h3>Navegação</h3>
      <ul>
        <li><a href="#visao-geral">Visão Geral</a></li>
        <li><a href="#camadas">Camadas</a></li>
        <li><a href="#inicio-rapido">Início Rápido</a></li>
        <li><a href="#parametros">Parâmetros</a></li>
        <li><a href="#exemplos">Exemplos</a></li>
        <li><a href="#download">Download Completo</a></li>
        <li><a href="#erros">Erros</a></li>
        <li><a href="#campos">Campos</a></li>
      </ul>
    </nav>
    <main class="main">
      <section id="visao-geral">
        <h2>Visão Geral</h2>
        <p>API REST de alta performance para consulta de <strong>22.000+ equipamentos</strong> e ativos urbanos.</p>
        <div class="card highlight">
          <h4>Recursos v5.2</h4>
          <ul style="margin-left:20px;margin-top:12px">
            <li><strong>Camadas de dados</strong> - main, panels, abrigoamigo, full, summary</li>
            <li><strong>Dados de paineis</strong> - Contagem precisa</li>
            <li><strong>Abrigo Amigo</strong> - Iniciativa de segurança para mulheres</li>
            <li><strong>Marca do painel digital</strong> - BOE, CHINA, LG, etc.</li>
            <li><strong>Meta introspection</strong> - ?meta=layers</li>
            <li><strong>Cache</strong> - 10x mais rapido</li>
            <li><strong>Geoespacial</strong> - Busca por raio em km</li>
          </ul>
        </div>
        <h3>URL Base</h3>
        <div class="url-box">` +
    ScriptApp.getService().getUrl() +
    `?docs=false</div>
        <div class="alert alert-info"><span>💡</span><span>Adicione <code>?docs=false</code> para acessar a API diretamente</span></div>
      </section>
      
      <section id="camadas">
        <h2>Camadas de Dados</h2>
        <p>Use o parâmetro <code>layer</code> para selecionar a camada de dados.</p>
        <table>
          <thead><tr><th>Camada</th><th>Descrição</th></tr></thead>
          <tbody>
            <tr><td><code>main</code></td><td>Dados principais (padrão)</td></tr>
            <tr><td><code>panels</code></td><td>Apenas dados de painéis</td></tr>
            <tr><td><code>abrigoamigo</code></td><td>Equipamentos com Abrigo Amigo</td></tr>
            <tr><td><code>full</code></td><td>Main + Panels + Abrigo Amigo mesclados</td></tr>
            <tr><td><code>summary</code></td><td>Main + contagens de painéis + Abrigo Amigo</td></tr>
          </tbody>
        </table>
        <h3>Introspection</h3>
        <p>Use <code>?meta=layers</code> para descobrir camadas disponíveis.</p>
      </section>
      
      <section id="inicio-rapido">
        <h2>Início Rápido</h2>
        <div class="code-tabs">
          <div class="tab-buttons">
            <button class="tab-btn active" data-tab="curl">cURL</button>
            <button class="tab-btn" data-tab="js">JavaScript</button>
            <button class="tab-btn" data-tab="python">Python</button>
          </div>
          <div class="tab-content active" id="curl">
            <div class="code-header"><span class="code-lang">bash</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div>
            <pre><code class="language-bash"># Buscar primeiros 1000 registros
curl "` +
    ScriptApp.getService().getUrl() +
    `?docs=false"

# Com filtros
curl "` +
    ScriptApp.getService().getUrl() +
    `?docs=false&status=Ativo&cidade=SÃO%20PAULO"</code></pre>
          </div>
          <div class="tab-content" id="js">
            <div class="code-header"><span class="code-lang">javascript</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div>
            <pre><code class="language-javascript">const API = '` +
    ScriptApp.getService().getUrl() +
    `?docs=false';

const response = await fetch(API);
const data = await response.json();
console.log(data.total + ' registros');</code></pre>
          </div>
          <div class="tab-content" id="python">
            <div class="code-header"><span class="code-lang">python</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div>
            <pre><code class="language-python">import requests

API = '` +
    ScriptApp.getService().getUrl() +
    `?docs=false'
data = requests.get(API).json()
print(f"{data['total']} registros")</code></pre>
          </div>
        </div>
      </section>

      <section id="parametros">
        <h2>Parâmetros</h2>
        <h3>Paginação</h3>
        <table>
          <thead><tr><th>Parâmetro</th><th>Padrão</th><th>Descrição</th></tr></thead>
          <tbody>
            <tr><td><code>start</code></td><td>0</td><td>Offset inicial</td></tr>
            <tr><td><code>limit</code></td><td>1000</td><td>Registros por página (máx: 5000)</td></tr>
            <tr><td><code>after</code></td><td>-</td><td>Cursor (Nº Eletro)</td></tr>
          </tbody>
        </table>
        <h3>Filtros</h3>
        <table>
          <thead><tr><th>Parâmetro</th><th>Descrição</th></tr></thead>
          <tbody>
            <tr><td><code>q</code></td><td>Busca textual</td></tr>
            <tr><td><code>nparada</code></td><td>Buscar por Nº Parada</td></tr>
            <tr><td><code>neletro</code></td><td>Buscar por Nº Eletro</td></tr>
            <tr><td><code>endereco</code></td><td>Buscar por Endereço</td></tr>
            <tr><td><code>status</code></td><td>Filtrar por Status</td></tr>
            <tr><td><code>cidade</code></td><td>Filtrar por cidade</td></tr>
            <tr><td><code>estado</code></td><td>Filtrar por estado</td></tr>
            <tr><td><code>bairro</code></td><td>Filtrar por bairro</td></tr>
          </tbody>
        </table>
        <h3>Geoespacial</h3>
        <table>
          <thead><tr><th>Parâmetro</th><th>Descrição</th></tr></thead>
          <tbody>
            <tr><td><code>lat</code>, <code>lon</code></td><td>Coordenadas</td></tr>
            <tr><td><code>radius</code></td><td>Raio em km (padrão: 5)</td></tr>
          </tbody>
        </table>
      </section>

      <section id="exemplos">
        <h2>Exemplos</h2>
        <h3>TypeScript</h3>
        <div class="code-tabs"><div class="tab-content active">
          <div class="code-header"><span class="code-lang">typescript</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div>
          <pre><code class="language-typescript">interface ApiResponse {
  status: 'success' | 'error';
  meta: { count: number; total: number; cached: boolean };
  data: Equipment[];
}

async function fetchEquipments(): Promise&lt;ApiResponse&gt; {
  const response = await fetch('` +
    ScriptApp.getService().getUrl() +
    `?docs=false');
  return response.json();
}</code></pre>
        </div></div>
        <h3>Apps Script</h3>
        <div class="code-tabs"><div class="tab-content active">
          <div class="code-header"><span class="code-lang">javascript</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div>
          <pre><code class="language-javascript">function buscarAtivos() {
  const url = '` +
    ScriptApp.getService().getUrl() +
    `?docs=false&status=Ativo';
  const response = UrlFetchApp.fetch(url);
  return JSON.parse(response.getContentText());
}</code></pre>
        </div></div>
      </section>

      <section id="download">
        <h2>Download Completo</h2>
        <p>Para baixar todos os 22.000+ registros:</p>
        <div class="code-tabs"><div class="tab-content active">
          <div class="code-header"><span class="code-lang">javascript</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div>
          <pre><code class="language-javascript">async function downloadAll() {
  const API = '` +
    ScriptApp.getService().getUrl() +
    `?docs=false';
  let allData = [], start = 0, total = Infinity;
  
  while (start < total) {
    const r = await fetch(API + '&start=' + start + '&limit=5000');
    const d = await r.json();
    allData = allData.concat(d.data);
    total = d.total;
    start += 5000;
  }
  return allData;
}</code></pre>
        </div></div>
      </section>

      <section id="erros">
        <h2>Tratamento de Erros</h2>
        <div class="code-tabs"><div class="tab-content active">
          <div class="code-header"><span class="code-lang">json</span></div>
          <pre><code class="language-json">// Sucesso
{ "status": "success", "meta": { "count": 1000, "total": 22038 }, "data": [...] }

// Rate Limit (429)
{ "status": "error", "code": 429, "message": "Too many requests", "meta": { "retryAfter": 60 } }</code></pre>
        </div></div>
        <div class="alert alert-warning"><span>⚠️</span><span><strong>Rate Limit:</strong> 100 requisições por minuto</span></div>
      </section>

      <section id="campos">
        <h2>Campos Disponíveis</h2>
        <table>
          <thead><tr><th>Campo</th><th>Tipo</th></tr></thead>
          <tbody>
            <tr><td><code>Nº Eletro</code></td><td>string</td></tr>
            <tr><td><code>Status</code></td><td>string</td></tr>
            <tr><td><code>Cidade</code>, <code>Estado</code>, <code>Bairro</code></td><td>string</td></tr>
            <tr><td><code>Latitude</code>, <code>Longitude</code></td><td>number</td></tr>
            <tr><td><code>Endereço</code></td><td>string</td></tr>
            <tr><td><code>Área de Trabalho</code></td><td>string</td></tr>
            <tr><td><code>Data Cadastro</code></td><td>string</td></tr>
            <tr><td><code>Link Operações</code>, <code>Foto Referência</code></td><td>URL</td></tr>
          </tbody>
        </table>
      </section>
      
      <footer style="margin-top:64px;padding-top:32px;border-top:1px solid var(--gray-200);color:var(--gray-600);font-size:14px">
        <p>© 2025 Eletromidia - API de Ativos v5.1</p>
      </footer>
    </main>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>
  <script>
    document.querySelectorAll('.tab-btn').forEach(btn=>{btn.addEventListener('click',()=>{const g=btn.closest('.code-tabs');g.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));g.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));btn.classList.add('active');g.querySelector('#'+btn.dataset.tab).classList.add('active')})});
    function copyCode(btn){const code=btn.closest('.tab-content,.code-tabs').querySelector('code').textContent;navigator.clipboard.writeText(code);btn.textContent='Copiado!';setTimeout(()=>btn.textContent='Copiar',2000)}
    const secs=document.querySelectorAll('section'),navs=document.querySelectorAll('.sidebar a');
    window.addEventListener('scroll',()=>{let cur='';secs.forEach(s=>{if(window.scrollY>=s.offsetTop-100)cur=s.id});navs.forEach(l=>{l.classList.remove('active');if(l.getAttribute('href')==='#'+cur)l.classList.add('active')})});
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle("API de Ativos - Documentação")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
