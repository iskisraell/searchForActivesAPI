// ---------------------------------------------------------------------------
// GOOGLE APPS SCRIPT CODE - SOTA OPTIMIZED V5
// Features: Multi-Layer Data Mesh, Caching, Multi-field Filtering,
//           Sparse Fieldsets, Cursor Pagination, Enhanced Error Handling,
//           Rate Limiting, Rich Metadata, Meta Introspection
// ---------------------------------------------------------------------------

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │  SECURITY CONFIGURATION (v5.4.0)                                            │
// │  API Key + HMAC-SHA256 + Domain Validation                                  │
// └─────────────────────────────────────────────────────────────────────────────┘

var SECURITY = {
  // Enable/disable security (set to false for migration period)
  ENABLED: true,
  
  // Grace period: allow requests without auth but log warnings
  GRACE_MODE: true,
  
  // Allowed origins for CORS and domain validation
  ALLOWED_ORIGINS: [
    "https://radar-eletromidia.vercel.app",
    "http://localhost:5173",  // Vite default
    "http://localhost:3000",  // Common dev port
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000"
  ],
  
  // Timestamp tolerance for HMAC validation (5 minutes in ms)
  TIMESTAMP_TOLERANCE_MS: 5 * 60 * 1000,
  
  // Public endpoints that don't require authentication
  PUBLIC_ENDPOINTS: [
    "docs",      // Documentation page
    "meta"       // Meta introspection
  ],
  
  // API Key configuration
  // Keys are stored in Script Properties for security
  // Format: { keyId: { secret: string, name: string, permissions: string[], rateLimit: number } }
  API_KEYS_PROPERTY: "API_KEYS_CONFIG",
  
  // Rate limit per key (requests per minute)
  DEFAULT_RATE_LIMIT: 100,
  PREMIUM_RATE_LIMIT: 500,
  
  // Error messages
  ERRORS: {
    MISSING_API_KEY: "API key required. Add 'apikey' parameter to your request.",
    INVALID_API_KEY: "Invalid API key. Check your credentials.",
    EXPIRED_TIMESTAMP: "Request timestamp expired. Ensure your clock is synchronized.",
    INVALID_SIGNATURE: "Invalid request signature. Check your HMAC implementation.",
    INVALID_ORIGIN: "Request origin not allowed.",
    RATE_LIMITED: "Rate limit exceeded for this API key.",
    KEY_SUSPENDED: "This API key has been suspended."
  }
};

// Configuration
var CONFIG = {
  // API Metadata
  API_VERSION: "5.4.0",

  // Operational Dashboard Sheet ID
  OPERATIONAL_SHEET_ID: "1qFXG3O6kLkY7xD9pfxpaq5eD1AWlAnNDTLGm_sxTOvI",
  OPERATIONAL_CACHE_DURATION: 1800, // 30 minutes for operational data

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

    // ┌─────────────────────────────────────────────────────────────────────┐
    // │  OPERATIONAL DASHBOARD LAYERS (v5.3.0)                              │
    // │  Source: BASE GERAL sheet - 1qFXG3O6kLkY7xD9pfxpaq5eD1AWlAnNDTLGm_sxTOvI │
    // └─────────────────────────────────────────────────────────────────────┘

    maintenance_performance: {
      sheetId: "1qFXG3O6kLkY7xD9pfxpaq5eD1AWlAnNDTLGm_sxTOvI",
      tabName: "01 - BASE GERAL - PREVENTIVAS 2025",
      displayName: "Desempenho de Manutenção Preventiva",
      description: "Weekly maintenance tracking by FILIAL with 1º BI and 2º BI periods",
      headerRow: 4, // Headers are on row 4 (skip 3 rows of title/empty)
      cacheDuration: 1800, // 30 minutes
      type: "aggregation",
      fields: ["FILIAL", "SEMANA", "PREVISTO", "CONCLUIDO", "PENDENTE", "% REALIZADOS"],
    },

    incident_intelligence: {
      sheetId: "1qFXG3O6kLkY7xD9pfxpaq5eD1AWlAnNDTLGm_sxTOvI",
      tabName: "02 - BASE GERAL - TIPOS DE OCORRÊNCIAS",
      displayName: "Inteligência de Ocorrências",
      description: "Geographic and category analysis of maintenance issues",
      headerRow: 3, // Headers are on row 3
      cacheDuration: 1800, // 30 minutes
      type: "aggregation",
      fields: ["Ponto", "FILIAL", "BAIRRO", "OCORRÊNCIAS", "Total", "%"],
    },

    service_level: {
      sheetId: "1qFXG3O6kLkY7xD9pfxpaq5eD1AWlAnNDTLGm_sxTOvI",
      tabName: "05 - BASE GERAL - SAC COP",
      displayName: "SLA e Atendimento SAC/COP",
      description: "SLA tracking and resolution time for service tickets",
      headerRow: 1, // Headers are on row 1
      joinKey: "COD. ELERO",
      secondaryJoinKey: "PRIMARY KEY",
      cacheDuration: 1800, // 30 minutes
      type: "enrichment",
      fields: [
        "FILIAL", "DATA", "SEMANA", "ORIGEM", "COD. ELERO", "PRIMARY KEY",
        "CODIGO SPTRANS", "EQUIPAMENTO", "OCORRÊNCIA", "STATUS", "CONCLUIDO",
        "PENDENTE", "PORCENTAGEM ATENDIMENTO", "DATA DE RESPOSTA", "SLA",
        "EQUIP - RESUMO", "INDICE", "DIAS EM ABERTO"
      ],
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

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │  SECURITY FUNCTIONS (v5.4.0)                                                │
// │  API Key Authentication + HMAC Request Signing + Origin Validation          │
// └─────────────────────────────────────────────────────────────────────────────┘

/**
 * Get API keys from Script Properties
 * Keys are stored as JSON: { "keyId": { "secret": "...", "name": "...", "permissions": [...], "rateLimit": 100, "suspended": false } }
 */
function getApiKeys() {
  var props = PropertiesService.getScriptProperties();
  var keysJson = props.getProperty(SECURITY.API_KEYS_PROPERTY);
  
  if (!keysJson) {
    // Return default key for migration period
    return {
      "eletro-radar-dashboard": {
        secret: "CHANGE_ME_IN_PRODUCTION",
        name: "Radar Dashboard (Migration)",
        permissions: ["*"],
        rateLimit: SECURITY.PREMIUM_RATE_LIMIT,
        suspended: false
      }
    };
  }
  
  try {
    return JSON.parse(keysJson);
  } catch (e) {
    Logger.log("Error parsing API keys: " + e.toString());
    return {};
  }
}

/**
 * Validate API key
 * @param {string} apiKey - The API key from request
 * @returns {Object} { valid: boolean, keyConfig: Object|null, error: string|null }
 */
function validateApiKey(apiKey) {
  if (!apiKey) {
    return { valid: false, keyConfig: null, error: SECURITY.ERRORS.MISSING_API_KEY };
  }
  
  var keys = getApiKeys();
  var keyConfig = keys[apiKey];
  
  if (!keyConfig) {
    return { valid: false, keyConfig: null, error: SECURITY.ERRORS.INVALID_API_KEY };
  }
  
  if (keyConfig.suspended) {
    return { valid: false, keyConfig: keyConfig, error: SECURITY.ERRORS.KEY_SUSPENDED };
  }
  
  return { valid: true, keyConfig: keyConfig, error: null };
}

/**
 * Validate HMAC signature for request integrity
 * Signature = HMAC-SHA256(secret, timestamp + "|" + apiKey + "|" + sortedParams)
 * @param {Object} e - Request event object
 * @param {string} secret - The API key secret
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateHmacSignature(e, secret) {
  var params = e.parameter || {};
  var timestamp = params.timestamp;
  var signature = params.signature;
  
  // If no signature provided, skip HMAC validation (for simple API key mode)
  if (!signature) {
    return { valid: true, error: null, skipped: true };
  }
  
  // Validate timestamp
  if (!timestamp) {
    return { valid: false, error: SECURITY.ERRORS.EXPIRED_TIMESTAMP };
  }
  
  var requestTime = parseInt(timestamp);
  var now = new Date().getTime();
  var timeDiff = Math.abs(now - requestTime);
  
  if (timeDiff > SECURITY.TIMESTAMP_TOLERANCE_MS) {
    return { valid: false, error: SECURITY.ERRORS.EXPIRED_TIMESTAMP };
  }
  
  // Build the string to sign (exclude signature from params)
  var paramsToSign = [];
  var sortedKeys = Object.keys(params).sort();
  
  for (var i = 0; i < sortedKeys.length; i++) {
    var key = sortedKeys[i];
    if (key !== "signature") {
      paramsToSign.push(key + "=" + params[key]);
    }
  }
  
  var stringToSign = paramsToSign.join("&");
  
  // Compute expected signature
  var expectedSignature = computeHmacSha256(secret, stringToSign);
  
  // Compare signatures (timing-safe comparison)
  if (!timingSafeEqual(signature, expectedSignature)) {
    return { valid: false, error: SECURITY.ERRORS.INVALID_SIGNATURE };
  }
  
  return { valid: true, error: null, skipped: false };
}

/**
 * Compute HMAC-SHA256 signature
 */
function computeHmacSha256(secret, message) {
  var signature = Utilities.computeHmacSha256Signature(message, secret);
  
  // Convert to hex string
  var hexString = signature.map(function(byte) {
    var hex = (byte < 0 ? byte + 256 : byte).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
  
  return hexString;
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  
  var result = 0;
  for (var i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Validate request origin (basic check - can be spoofed but adds a layer)
 * Note: In GAS, we can't access Referer/Origin headers reliably from doGet
 * This is a best-effort check using available information
 */
function validateOrigin(e) {
  // GAS doGet doesn't provide headers, so we can't validate origin
  // This is handled by the API key + HMAC which provides better security
  // In production, origin validation would be done via a proxy
  return { valid: true, error: null };
}

/**
 * Check per-key rate limiting
 */
function checkKeyRateLimit(apiKey, keyConfig) {
  var cache = CacheService.getScriptCache();
  var rateLimitKey = "ratelimit_" + apiKey;
  var rateLimit = keyConfig.rateLimit || SECURITY.DEFAULT_RATE_LIMIT;
  
  var current = cache.get(rateLimitKey);
  var count = current ? parseInt(current) : 0;
  
  if (count >= rateLimit) {
    return { limited: true, retryAfter: 60, remaining: 0 };
  }
  
  // Increment counter
  cache.put(rateLimitKey, String(count + 1), 60); // 1 minute window
  
  return { limited: false, remaining: rateLimit - count - 1 };
}

/**
 * Main authentication function
 * @param {Object} e - Request event object
 * @returns {Object} { authenticated: boolean, keyConfig: Object|null, error: string|null, code: number }
 */
function authenticateRequest(e) {
  // Check if security is enabled
  if (!SECURITY.ENABLED) {
    return { authenticated: true, keyConfig: null, error: null, code: 200 };
  }
  
  var params = e.parameter || {};
  var apiKey = params.apikey;
  
  // Grace mode: allow unauthenticated requests but log warning
  if (!apiKey && SECURITY.GRACE_MODE) {
    Logger.log("SECURITY WARNING: Unauthenticated request (grace mode active)");
    return { 
      authenticated: true, 
      keyConfig: null, 
      error: null, 
      code: 200,
      graceMode: true,
      warning: "API key recommended. Security will be enforced in future versions."
    };
  }
  
  // Validate API key
  var keyValidation = validateApiKey(apiKey);
  if (!keyValidation.valid) {
    return { 
      authenticated: false, 
      keyConfig: null, 
      error: keyValidation.error, 
      code: 401 
    };
  }
  
  var keyConfig = keyValidation.keyConfig;
  
  // Validate HMAC signature (if provided)
  var hmacValidation = validateHmacSignature(e, keyConfig.secret);
  if (!hmacValidation.valid) {
    return { 
      authenticated: false, 
      keyConfig: keyConfig, 
      error: hmacValidation.error, 
      code: 401 
    };
  }
  
  // Check per-key rate limiting
  var rateLimitCheck = checkKeyRateLimit(apiKey, keyConfig);
  if (rateLimitCheck.limited) {
    return { 
      authenticated: false, 
      keyConfig: keyConfig, 
      error: SECURITY.ERRORS.RATE_LIMITED, 
      code: 429,
      retryAfter: rateLimitCheck.retryAfter
    };
  }
  
  // All checks passed
  return { 
    authenticated: true, 
    keyConfig: keyConfig, 
    error: null, 
    code: 200,
    remaining: rateLimitCheck.remaining,
    hmacVerified: !hmacValidation.skipped
  };
}

/**
 * Check if request is for a public endpoint
 */
function isPublicEndpoint(e) {
  var params = e.parameter || {};
  
  // Documentation pages are public
  if (params.docs === "true") return true;
  
  // Meta endpoints are public  
  if (params.meta) return true;
  
  // No params = serve documentation (public)
  var hasApiParams = params.start !== undefined ||
    params.limit !== undefined ||
    params.q !== undefined ||
    params.layer !== undefined ||
    params.nparada !== undefined ||
    params.neletro !== undefined;
    
  if (!hasApiParams && params.docs !== "false") return true;
  
  return false;
}

/**
 * Create authentication error response
 */
function createAuthError(authResult, startTime) {
  var executionTime = startTime ? new Date().getTime() - startTime : 0;
  
  var response = {
    status: "error",
    code: authResult.code,
    message: authResult.error,
    meta: {
      apiVersion: CONFIG.API_VERSION,
      executionTimeMs: executionTime,
      security: {
        authenticated: false,
        documentation: ScriptApp.getService().getUrl()
      }
    }
  };
  
  if (authResult.retryAfter) {
    response.meta.retryAfter = authResult.retryAfter;
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// API KEY MANAGEMENT UTILITIES (Run these manually in Script Editor)
// ---------------------------------------------------------------------------

/**
 * Generate a new API key (run manually in Script Editor)
 * Usage: Run this function, copy the output, add to your client
 */
function generateNewApiKey() {
  var keyId = "key_" + Utilities.getUuid().replace(/-/g, "").substring(0, 16);
  var secret = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  
  Logger.log("=== NEW API KEY GENERATED ===");
  Logger.log("Key ID (use as 'apikey' parameter): " + keyId);
  Logger.log("Secret (for HMAC signing): " + secret);
  Logger.log("");
  Logger.log("Add this to your Script Properties using setupApiKey():");
  Logger.log(JSON.stringify({
    keyId: keyId,
    secret: secret,
    name: "My Application",
    permissions: ["*"],
    rateLimit: 100
  }, null, 2));
  
  return { keyId: keyId, secret: secret };
}

/**
 * Setup the Radar Dashboard API key
 * Run this ONCE to initialize the dashboard key
 */
function setupRadarDashboardKey() {
  var keyId = "eletro-radar-dashboard";
  var secret = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  
  var keys = {};
  
  // Try to load existing keys
  var props = PropertiesService.getScriptProperties();
  var existingKeysJson = props.getProperty(SECURITY.API_KEYS_PROPERTY);
  if (existingKeysJson) {
    try {
      keys = JSON.parse(existingKeysJson);
    } catch (e) {}
  }
  
  // Add/update dashboard key
  keys[keyId] = {
    secret: secret,
    name: "Radar Eletromidia Dashboard",
    permissions: ["*"],
    rateLimit: SECURITY.PREMIUM_RATE_LIMIT,
    suspended: false,
    createdAt: new Date().toISOString()
  };
  
  // Save to properties
  props.setProperty(SECURITY.API_KEYS_PROPERTY, JSON.stringify(keys));
  
  Logger.log("=== RADAR DASHBOARD API KEY CONFIGURED ===");
  Logger.log("");
  Logger.log("API Key (VITE_API_KEY): " + keyId);
  Logger.log("Secret (VITE_API_SECRET): " + secret);
  Logger.log("");
  Logger.log("Add these to Vercel Environment Variables:");
  Logger.log("  VITE_API_KEY=" + keyId);
  Logger.log("  VITE_API_SECRET=" + secret);
  Logger.log("");
  Logger.log("And to your local .env.local file for development");
  
  return { keyId: keyId, secret: secret };
}

/**
 * View all configured API keys (without secrets)
 */
function listApiKeys() {
  var keys = getApiKeys();
  var summary = [];
  
  for (var keyId in keys) {
    summary.push({
      keyId: keyId,
      name: keys[keyId].name,
      permissions: keys[keyId].permissions,
      rateLimit: keys[keyId].rateLimit,
      suspended: keys[keyId].suspended || false,
      createdAt: keys[keyId].createdAt
    });
  }
  
  Logger.log("=== CONFIGURED API KEYS ===");
  Logger.log(JSON.stringify(summary, null, 2));
  
  return summary;
}

/**
 * Suspend an API key
 */
function suspendApiKey(keyId) {
  var props = PropertiesService.getScriptProperties();
  var keysJson = props.getProperty(SECURITY.API_KEYS_PROPERTY);
  
  if (!keysJson) {
    Logger.log("No API keys configured");
    return false;
  }
  
  var keys = JSON.parse(keysJson);
  
  if (!keys[keyId]) {
    Logger.log("Key not found: " + keyId);
    return false;
  }
  
  keys[keyId].suspended = true;
  keys[keyId].suspendedAt = new Date().toISOString();
  
  props.setProperty(SECURITY.API_KEYS_PROPERTY, JSON.stringify(keys));
  
  Logger.log("Key suspended: " + keyId);
  return true;
}

// ---------------------------------------------------------------------------
// ENTRY POINTS
// ---------------------------------------------------------------------------

function doGet(e) {
  var startTime = new Date().getTime();
  try {
    return handleRequest(e, startTime);
  } catch (err) {
    return createError(err.toString(), startTime);
  }
}

function handleRequest(e, startTime) {
  // Check for meta introspection request (public - no auth required)
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
      e.parameter.cliente !== undefined ||
      // Operational Dashboard params (v5.3.0)
      e.parameter.semana !== undefined ||
      e.parameter.periodo !== undefined ||
      e.parameter.topN !== undefined ||
      e.parameter.ocorrencia !== undefined ||
      e.parameter.origem !== undefined ||
      e.parameter.statusTicket !== undefined ||
      e.parameter.codEletro !== undefined ||
      e.parameter.agregado !== undefined);

  // If no API params, serve the documentation HTML page (public - no auth required)
  if (!hasApiParams && (!e.parameter || e.parameter.docs !== "false")) {
    return serveDocumentationPage();
  }

  // Check for markdown docs request (public - no auth required)
  if (e.parameter && e.parameter.docs === "true") {
    return returnDocumentation();
  }

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  SECURITY CHECK (v5.4.0)                                                │
  // │  Authenticate request before processing data queries                    │
  // └─────────────────────────────────────────────────────────────────────────┘
  
  var authResult = authenticateRequest(e);
  
  if (!authResult.authenticated) {
    return createAuthError(authResult, startTime);
  }
  
  // Store auth info for response metadata
  var authInfo = {
    keyName: authResult.keyConfig ? authResult.keyConfig.name : null,
    graceMode: authResult.graceMode || false,
    hmacVerified: authResult.hmacVerified || false,
    remaining: authResult.remaining,
    warning: authResult.warning
  };

  // Parse all parameters
  var params = parseParameters(e);
  
  // Attach auth info to params for downstream use
  params.authInfo = authInfo;

  // Check rate limiting (legacy global check - per-key check done in authenticateRequest)
  // Keeping this for backward compatibility during migration
  if (!authResult.keyConfig) {
    var rateLimitResult = checkRateLimit();
    if (rateLimitResult.limited) {
      return createRateLimitError(rateLimitResult.retryAfter, startTime);
    }
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

    // Operational Dashboard filters (v5.3.0)
    operationalFilters: {
      filial: p.filial || null,
      semana: p.semana || null,
      periodo: p.periodo || null, // "1BI" or "2BI"
      topN: p.topN ? parseInt(p.topN) : null,
      ocorrencia: p.ocorrencia || null,
      origem: p.origem || null, // SAC, COP, LIDIA
      statusTicket: p.statusTicket || null, // CONCLUIDO, PENDENTE
      codEletro: p.codEletro || null, // For service_level drill-down
      agregado: p.agregado === "true", // Aggregation mode
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
  var validLayers = [
    "main", "panels", "abrigoamigo", "full", "summary",
    // Operational Dashboard layers (v5.3.0)
    "maintenance_performance", "incident_intelligence", "service_level"
  ];
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

    // ┌─────────────────────────────────────────────────────────────────────┐
    // │  OPERATIONAL DASHBOARD LAYERS (v5.3.0)                              │
    // └─────────────────────────────────────────────────────────────────────┘
    case "maintenance_performance":
      return getMaintenancePerformanceData(params);

    case "incident_intelligence":
      return getIncidentIntelligenceData(params);

    case "service_level":
      return getServiceLevelData(params);

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

  // Add operational filters to key (v5.3.0)
  if (params.operationalFilters) {
    var opf = params.operationalFilters;
    if (opf.semana) keyParts.push("sem:" + opf.semana);
    if (opf.periodo) keyParts.push("per:" + opf.periodo);
    if (opf.topN) keyParts.push("topn:" + opf.topN);
    if (opf.ocorrencia) keyParts.push("ocor:" + opf.ocorrencia);
    if (opf.origem) keyParts.push("orig:" + opf.origem);
    if (opf.statusTicket) keyParts.push("stkt:" + opf.statusTicket);
    if (opf.codEletro) keyParts.push("cod:" + opf.codEletro);
    if (opf.agregado) keyParts.push("agg:true");
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
// OPERATIONAL DASHBOARD LAYER FUNCTIONS (v5.3.0)
// ---------------------------------------------------------------------------

/**
 * Helper: Parse Brazilian number format (e.g., "1.027,00" → 1027.0)
 */
function parseBrazilianNumber(val) {
  if (val === null || val === undefined || val === "") return 0;
  var str = String(val).trim();
  // Remove thousands separator (.) and replace decimal separator (,) with (.)
  str = str.replace(/\./g, "").replace(",", ".");
  var num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Helper: Parse percentage string (e.g., "23%" → 0.23)
 */
function parsePercentage(val) {
  if (val === null || val === undefined || val === "") return 0;
  var str = String(val).trim().replace("%", "").replace(",", ".");
  var num = parseFloat(str);
  return isNaN(num) ? 0 : num / 100;
}

/**
 * Fetches and processes PREVENTIVAS 2025 data
 * Parses both 1º BI and 2º BI sections into unified dataset
 */
function getMaintenancePerformanceData(params) {
  var cache = CacheService.getScriptCache();
  var cacheKey = "maintenance_performance_v1";
  var layer = CONFIG.LAYERS.maintenance_performance;

  // Check cache first (unless noCache)
  if (!params.noCache) {
    var cached = cache.get(cacheKey);
    if (cached) {
      try {
        var parsedCache = JSON.parse(cached);
        // Apply filters and pagination to cached data
        return applyMaintenanceFilters(parsedCache, params);
      } catch (e) { /* cache corrupted */ }
    }
  }

  // Fetch from sheet
  var ss = SpreadsheetApp.openById(layer.sheetId);
  var sheet = ss.getSheetByName(layer.tabName);
  if (!sheet) {
    throw new Error("Sheet not found: " + layer.tabName);
  }

  var data = sheet.getDataRange().getValues();
  
  // The PREVENTIVAS 2025 sheet has a complex structure:
  // Row 1: empty
  // Row 2: "1º BI" header spanning columns, then "2º BI" header
  // Row 3: "Valores" headers
  // Row 4: Column headers (FILIAL, SEMANA, PREVISTO, CONCLUIDO, PENDENTE, SEMANA CONCLUIDO, % REALIZADOS)
  // Data starts at row 5
  
  // 1º BI columns (0-indexed): 2=FILIAL, 3=SEMANA, 4=PREVISTO, 5=CONCLUIDO, 6=PENDENTE, 7=SEMANA CONCLUIDO, 8=% REALIZADOS
  // 2º BI columns (0-indexed): 10=FILIAL, 11=SEMANA, 12=PREVISTO, 13=CONCLUIDO, 14=PENDENTE, 15=SEMANA CONCLUIDO, 16=% REALIZADOS
  
  var results = [];
  var dataRows = data.slice(4); // Skip 4 header rows (0-3)

  dataRows.forEach(function(row, idx) {
    // Parse 1º BI data (columns 2-8)
    var filial1 = String(row[2] || "").trim();
    if (filial1 && filial1 !== "" && filial1.indexOf("FILIAL") > -1 || filial1 === "MATRIZ") {
      results.push({
        filial: filial1,
        semana: String(row[3] || "").trim(),
        previsto: parseBrazilianNumber(row[4]),
        concluido: parseBrazilianNumber(row[5]),
        pendente: parseBrazilianNumber(row[6]),
        semanaConcluido: parseBrazilianNumber(row[7]),
        percentRealizados: parsePercentage(row[8]),
        periodo: "1BI",
        _rowIndex: idx + 5
      });
    }

    // Parse 2º BI data (columns 10-16)
    var filial2 = String(row[10] || "").trim();
    if (filial2 && filial2 !== "" && (filial2.indexOf("FILIAL") > -1 || filial2 === "MATRIZ")) {
      results.push({
        filial: filial2,
        semana: String(row[11] || "").trim(),
        previsto: parseBrazilianNumber(row[12]),
        concluido: parseBrazilianNumber(row[13]),
        pendente: parseBrazilianNumber(row[14]),
        semanaConcluido: parseBrazilianNumber(row[15]),
        percentRealizados: parsePercentage(row[16]),
        periodo: "2BI",
        _rowIndex: idx + 5
      });
    }
  });

  // Cache the raw results
  try {
    var cacheData = JSON.stringify(results);
    if (cacheData.length < 100000) {
      cache.put(cacheKey, cacheData, CONFIG.OPERATIONAL_CACHE_DURATION);
    }
  } catch (e) { /* cache write failed */ }

  return applyMaintenanceFilters(results, params);
}

/**
 * Applies filters and aggregation to maintenance performance data
 */
function applyMaintenanceFilters(allData, params) {
  var opFilters = params.operationalFilters || {};
  var filteredData = allData;

  // Apply filters
  if (opFilters.filial) {
    filteredData = filteredData.filter(function(r) {
      return r.filial.toUpperCase().indexOf(opFilters.filial.toUpperCase()) > -1;
    });
  }
  if (opFilters.semana) {
    filteredData = filteredData.filter(function(r) {
      return r.semana.indexOf(opFilters.semana) > -1;
    });
  }
  if (opFilters.periodo) {
    filteredData = filteredData.filter(function(r) {
      return r.periodo === opFilters.periodo.toUpperCase();
    });
  }

  var total = filteredData.length;
  var responseData;

  // Aggregation mode
  if (opFilters.agregado) {
    var aggregated = {};
    filteredData.forEach(function(r) {
      var key = r.filial + "|" + r.periodo;
      if (!aggregated[key]) {
        aggregated[key] = {
          filial: r.filial,
          periodo: r.periodo,
          totalPrevisto: 0,
          totalConcluido: 0,
          totalPendente: 0,
          avgPercentRealizados: 0,
          semanaCount: 0
        };
      }
      aggregated[key].totalPrevisto += r.previsto;
      aggregated[key].totalConcluido += r.concluido;
      aggregated[key].totalPendente += r.pendente;
      aggregated[key].avgPercentRealizados += r.percentRealizados;
      aggregated[key].semanaCount++;
    });

    // Calculate averages
    responseData = Object.keys(aggregated).map(function(k) {
      var agg = aggregated[k];
      agg.avgPercentRealizados = agg.semanaCount > 0 
        ? Math.round((agg.avgPercentRealizados / agg.semanaCount) * 10000) / 10000
        : 0;
      return agg;
    });
    total = responseData.length;
  } else {
    // Paginate raw data
    responseData = filteredData.slice(params.start, params.start + params.limit);
  }

  return {
    data: responseData,
    total: total,
    cached: false,
    cacheExpires: new Date(Date.now() + CONFIG.OPERATIONAL_CACHE_DURATION * 1000).toISOString(),
    layer: "maintenance_performance"
  };
}

/**
 * Fetches and processes TIPOS DE OCORRÊNCIAS data
 * Supports Top-N filtering and BAIRRO normalization
 */
function getIncidentIntelligenceData(params) {
  var cache = CacheService.getScriptCache();
  var cacheKey = "incident_intelligence_v1";
  var layer = CONFIG.LAYERS.incident_intelligence;

  // Check cache first
  if (!params.noCache) {
    var cached = cache.get(cacheKey);
    if (cached) {
      try {
        var parsedCache = JSON.parse(cached);
        return applyIncidentFilters(parsedCache, params);
      } catch (e) { /* cache corrupted */ }
    }
  }

  // Fetch from sheet
  var ss = SpreadsheetApp.openById(layer.sheetId);
  var sheet = ss.getSheetByName(layer.tabName);
  if (!sheet) {
    throw new Error("Sheet not found: " + layer.tabName);
  }

  var data = sheet.getDataRange().getValues();
  
  // Structure: Row 1-2 empty, Row 3 has headers (index 2)
  // Headers: [empty], Ponto, FILIAL, BAIRRO, OCORRÊNCIAS, Total, %
  var headers = data[2];
  var dataRows = data.slice(3);

  // Find column indices
  var colMap = {};
  headers.forEach(function(h, i) {
    colMap[String(h).trim()] = i;
  });

  var results = [];
  dataRows.forEach(function(row, idx) {
    var bairro = String(row[colMap["BAIRRO"]] || "").trim();
    var ocorrencia = String(row[colMap["OCORRÊNCIAS"]] || "").trim();
    var totalVal = row[colMap["Total"]];
    
    // Skip rows without valid data
    if (!bairro || !ocorrencia) return;
    
    // Parse Total - can be empty or numeric
    var total = 0;
    if (totalVal !== null && totalVal !== undefined && totalVal !== "") {
      total = typeof totalVal === "number" ? totalVal : parseBrazilianNumber(totalVal);
    }

    results.push({
      ponto: String(row[colMap["Ponto"]] || "").trim(),
      filial: String(row[colMap["FILIAL"]] || "").trim(),
      bairro: bairro, // Already trimmed for reliable grouping
      ocorrencia: ocorrencia,
      total: total,
      percentual: parsePercentage(row[colMap["%"]]),
      _rowIndex: idx + 4
    });
  });

  // Cache results
  try {
    var cacheData = JSON.stringify(results);
    if (cacheData.length < 100000) {
      cache.put(cacheKey, cacheData, CONFIG.OPERATIONAL_CACHE_DURATION);
    }
  } catch (e) { /* cache write failed */ }

  return applyIncidentFilters(results, params);
}

/**
 * Applies filters to incident intelligence data including Top-N
 */
function applyIncidentFilters(allData, params) {
  var opFilters = params.operationalFilters || {};
  var filteredData = allData;

  // Apply filters
  if (opFilters.filial) {
    filteredData = filteredData.filter(function(r) {
      return r.filial.toUpperCase().indexOf(opFilters.filial.toUpperCase()) > -1;
    });
  }
  if (params.filters && params.filters.bairro) {
    filteredData = filteredData.filter(function(r) {
      return r.bairro.toUpperCase().indexOf(params.filters.bairro.toUpperCase()) > -1;
    });
  }
  if (opFilters.ocorrencia) {
    filteredData = filteredData.filter(function(r) {
      return r.ocorrencia.toUpperCase().indexOf(opFilters.ocorrencia.toUpperCase()) > -1;
    });
  }

  // Filter to only rows with total > 0 (actual incidents)
  var incidentsWithData = filteredData.filter(function(r) {
    return r.total > 0;
  });

  // Top-N filter: Get top N occurrences by total count
  var responseData;
  if (opFilters.topN && opFilters.topN > 0) {
    // Aggregate by occurrence type
    var occurrenceAgg = {};
    incidentsWithData.forEach(function(r) {
      if (!occurrenceAgg[r.ocorrencia]) {
        occurrenceAgg[r.ocorrencia] = { ocorrencia: r.ocorrencia, totalSum: 0, count: 0 };
      }
      occurrenceAgg[r.ocorrencia].totalSum += r.total;
      occurrenceAgg[r.ocorrencia].count++;
    });

    // Sort by totalSum descending and take top N
    var sortedOccurrences = Object.keys(occurrenceAgg)
      .map(function(k) { return occurrenceAgg[k]; })
      .sort(function(a, b) { return b.totalSum - a.totalSum; })
      .slice(0, opFilters.topN);

    var topOccurrenceNames = sortedOccurrences.map(function(o) { return o.ocorrencia; });

    // Filter to only include incidents from top N occurrence types
    responseData = incidentsWithData.filter(function(r) {
      return topOccurrenceNames.indexOf(r.ocorrencia) > -1;
    });
  } else {
    responseData = incidentsWithData;
  }

  var total = responseData.length;

  // Apply pagination
  var paginatedData = responseData.slice(params.start, params.start + params.limit);

  return {
    data: paginatedData,
    total: total,
    cached: false,
    cacheExpires: new Date(Date.now() + CONFIG.OPERATIONAL_CACHE_DURATION * 1000).toISOString(),
    layer: "incident_intelligence"
  };
}

/**
 * Fetches and processes SAC COP data (service level tickets)
 * Supports COD. ELERO drill-down and backlog calculation
 */
function getServiceLevelData(params) {
  var cache = CacheService.getScriptCache();
  var cacheKey = "service_level_v1";
  var layer = CONFIG.LAYERS.service_level;

  // Check cache first
  if (!params.noCache) {
    var cached = cache.get(cacheKey);
    if (cached) {
      try {
        var parsedCache = JSON.parse(cached);
        return applyServiceLevelFilters(parsedCache, params);
      } catch (e) { /* cache corrupted */ }
    }
  }

  // Fetch from sheet
  var ss = SpreadsheetApp.openById(layer.sheetId);
  var sheet = ss.getSheetByName(layer.tabName);
  if (!sheet) {
    throw new Error("Sheet not found: " + layer.tabName);
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0]; // Headers on row 1
  var dataRows = data.slice(1);

  // Build column map
  var colMap = {};
  headers.forEach(function(h, i) {
    colMap[String(h).trim()] = i;
  });

  var results = [];
  dataRows.forEach(function(row, idx) {
    var codEletro = String(row[colMap["COD. ELERO"]] || "").trim();
    var status = String(row[colMap["STATUS"]] || "").trim();
    
    // Skip empty rows
    if (!codEletro || codEletro === "") return;

    var diasEmAberto = row[colMap["DIAS EM ABERTO"]];
    var diasEmAbertoNum = 0;
    if (diasEmAberto !== null && diasEmAberto !== undefined && diasEmAberto !== "") {
      diasEmAbertoNum = typeof diasEmAberto === "number" ? diasEmAberto : parseInt(diasEmAberto);
      if (isNaN(diasEmAbertoNum)) diasEmAbertoNum = 0;
    }

    results.push({
      filial: String(row[colMap["FILIAL"]] || "").trim(),
      data: String(row[colMap["DATA"]] || ""),
      semana: String(row[colMap["SEMANA"]] || ""),
      origem: String(row[colMap["ORIGEM"]] || "").trim(),
      codEletro: codEletro,
      primaryKey: String(row[colMap["PRIMARY KEY"]] || ""),
      codigoSptrans: String(row[colMap["CODIGO SPTRANS"]] || ""),
      equipamento: String(row[colMap["EQUIPAMENTO"]] || "").trim(),
      ocorrencia: String(row[colMap["OCORRÊNCIA"]] || "").trim(),
      status: status,
      concluido: parseBrazilianNumber(row[colMap["CONCLUIDO"]]),
      pendente: parseBrazilianNumber(row[colMap["PENDENTE"]]),
      percentualAtendimento: parsePercentage(row[colMap["PORCENTAGEM ATENDIMENTO"]]),
      dataResposta: String(row[colMap["DATA DE RESPOSTA"]] || ""),
      sla: String(row[colMap["SLA"]] || ""),
      equipResumo: String(row[colMap["EQUIP - RESUMO"]] || "").trim(),
      indice: parseBrazilianNumber(row[colMap["INDICE"]]),
      diasEmAberto: diasEmAbertoNum,
      _rowIndex: idx + 2
    });
  });

  // Cache results
  try {
    var cacheData = JSON.stringify(results);
    if (cacheData.length < 100000) {
      cache.put(cacheKey, cacheData, CONFIG.OPERATIONAL_CACHE_DURATION);
    }
  } catch (e) { /* cache write failed */ }

  return applyServiceLevelFilters(results, params);
}

/**
 * Applies filters to service level data and calculates backlog metrics
 */
function applyServiceLevelFilters(allData, params) {
  var opFilters = params.operationalFilters || {};
  var filteredData = allData;

  // Apply filters
  if (opFilters.filial) {
    filteredData = filteredData.filter(function(r) {
      return r.filial.toUpperCase().indexOf(opFilters.filial.toUpperCase()) > -1;
    });
  }
  if (opFilters.semana) {
    filteredData = filteredData.filter(function(r) {
      return String(r.semana).indexOf(opFilters.semana) > -1;
    });
  }
  if (opFilters.origem) {
    filteredData = filteredData.filter(function(r) {
      return r.origem.toUpperCase() === opFilters.origem.toUpperCase();
    });
  }
  if (opFilters.statusTicket) {
    filteredData = filteredData.filter(function(r) {
      return r.status.toUpperCase() === opFilters.statusTicket.toUpperCase();
    });
  }
  if (opFilters.codEletro) {
    filteredData = filteredData.filter(function(r) {
      return r.codEletro.toUpperCase().indexOf(opFilters.codEletro.toUpperCase()) > -1;
    });
  }

  var total = filteredData.length;

  // Calculate backlog metrics
  var pendingTickets = filteredData.filter(function(r) {
    return r.status.toUpperCase() !== "CONCLUIDO";
  });
  
  var totalDiasEmAberto = 0;
  pendingTickets.forEach(function(r) {
    totalDiasEmAberto += r.diasEmAberto;
  });

  var backlogByOrigem = {};
  pendingTickets.forEach(function(r) {
    backlogByOrigem[r.origem] = (backlogByOrigem[r.origem] || 0) + 1;
  });

  var backlogMetrics = {
    totalPending: pendingTickets.length,
    avgDaysOpen: pendingTickets.length > 0 
      ? Math.round((totalDiasEmAberto / pendingTickets.length) * 100) / 100 
      : 0,
    byOrigem: backlogByOrigem
  };

  // Paginate
  var paginatedData = filteredData.slice(params.start, params.start + params.limit);

  return {
    data: paginatedData,
    total: total,
    backlog: backlogMetrics,
    cached: false,
    cacheExpires: new Date(Date.now() + CONFIG.OPERATIONAL_CACHE_DURATION * 1000).toISOString(),
    layer: "service_level"
  };
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
    case "security":
      response = getSecurityMeta();
      break;
    default:
      throw new Error(
        "Unknown meta type: " +
          metaType +
          ". Valid types: layers, version, schema, debug, security",
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
      // Operational Dashboard filters (v5.3.0)
      maintenance_performance: ["filial", "semana", "periodo", "agregado"],
      incident_intelligence: ["filial", "bairro", "ocorrencia", "topN"],
      service_level: ["filial", "semana", "origem", "statusTicket", "codEletro"],
    },
  };
}

function getVersionMeta() {
  return {
    apiVersion: CONFIG.API_VERSION,
    lastUpdated: "2026-01-06",
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
      // v5.3.0 Operational Dashboard
      "Operational Dashboard layers (maintenance, incidents, service level)",
      "Maintenance performance tracking with aggregation mode",
      "Incident intelligence with Top-N filtering",
      "Service level tracking with backlog metrics",
      // v5.4.0 Security
      "API Key authentication",
      "HMAC-SHA256 request signing",
      "Per-key rate limiting",
    ],
    security: {
      enabled: SECURITY.ENABLED,
      graceMode: SECURITY.GRACE_MODE,
      authMethods: ["apikey", "apikey+hmac"],
      documentation: "?meta=security"
    }
  };
}

/**
 * Get security configuration metadata (public info only - no secrets)
 */
function getSecurityMeta() {
  return {
    apiVersion: CONFIG.API_VERSION,
    security: {
      enabled: SECURITY.ENABLED,
      graceMode: SECURITY.GRACE_MODE,
      graceModeDescription: SECURITY.GRACE_MODE 
        ? "API key is recommended but not required during migration period"
        : "API key is required for all data requests",
      allowedOrigins: SECURITY.ALLOWED_ORIGINS,
      timestampToleranceMs: SECURITY.TIMESTAMP_TOLERANCE_MS,
      publicEndpoints: SECURITY.PUBLIC_ENDPOINTS
    },
    authentication: {
      methods: [
        {
          name: "API Key Only (Simple)",
          description: "Add apikey parameter to your request",
          example: "?apikey=YOUR_KEY&limit=100",
          security: "Medium - Key can be exposed in browser",
          recommended: false
        },
        {
          name: "API Key + HMAC-SHA256 (Recommended)",
          description: "Add apikey, timestamp, and signature parameters",
          example: "?apikey=YOUR_KEY&timestamp=1704067200000&signature=abc123...&limit=100",
          security: "High - Request integrity verified, replay attack protected",
          recommended: true,
          signatureAlgorithm: "HMAC-SHA256",
          signatureFormat: "Sort all params (except signature), join as key=value&key2=value2, compute HMAC with secret"
        }
      ],
      parameters: [
        { name: "apikey", required: true, description: "Your API key ID" },
        { name: "timestamp", required: false, description: "Request timestamp in milliseconds (for HMAC mode)" },
        { name: "signature", required: false, description: "HMAC-SHA256 signature of sorted params (for HMAC mode)" }
      ]
    },
    clientImplementation: {
      javascript: `
// Simple mode (API key only)
const response = await fetch(API_URL + '?apikey=YOUR_KEY&limit=100');

// HMAC mode (recommended)
function signRequest(params, secret) {
  const timestamp = Date.now();
  params.timestamp = timestamp;
  
  const sortedParams = Object.keys(params).sort()
    .map(k => k + '=' + params[k]).join('&');
  
  // Use SubtleCrypto in browser or crypto in Node.js
  const signature = await computeHmacSha256(secret, sortedParams);
  params.signature = signature;
  
  return params;
}`,
      python: `
import hmac
import hashlib
import time
import requests

def sign_request(params, secret):
    params['timestamp'] = str(int(time.time() * 1000))
    sorted_params = '&'.join(f'{k}={v}' for k, v in sorted(params.items()))
    signature = hmac.new(
        secret.encode(),
        sorted_params.encode(),
        hashlib.sha256
    ).hexdigest()
    params['signature'] = signature
    return params`
    },
    rateLimits: {
      default: SECURITY.DEFAULT_RATE_LIMIT,
      premium: SECURITY.PREMIUM_RATE_LIMIT,
      window: "1 minute",
      perKey: true,
      description: "Rate limits are applied per API key, not globally"
    },
    errors: {
      401: {
        code: 401,
        causes: ["Missing API key", "Invalid API key", "Expired timestamp", "Invalid signature"],
        resolution: "Check your API key and signature implementation"
      },
      403: {
        code: 403,
        causes: ["API key suspended", "Origin not allowed"],
        resolution: "Contact API administrator"
      },
      429: {
        code: 429,
        causes: ["Rate limit exceeded for API key"],
        resolution: "Wait for rate limit window to reset (1 minute)"
      }
    }
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
      // Operational Dashboard layers (v5.3.0)
      maintenance_performance: {
        fields: [
          { name: "filial", type: "string", filterable: true, description: "Branch (FILIAL LESTE, FILIAL SUL, MATRIZ)" },
          { name: "semana", type: "string", filterable: true, description: "Week number (01º SEMANA, 02º SEMANA, etc.)" },
          { name: "previsto", type: "number", description: "Planned maintenance count" },
          { name: "concluido", type: "number", description: "Completed maintenance count" },
          { name: "pendente", type: "number", description: "Pending maintenance count" },
          { name: "semanaConcluido", type: "number", description: "Completions in the week" },
          { name: "percentRealizados", type: "number", description: "Completion rate (0-1 decimal)" },
          { name: "periodo", type: "string", filterable: true, description: "Biannual period (1BI or 2BI)" },
        ],
        description: "Weekly preventive maintenance tracking by branch with 1st and 2nd biannual periods",
        type: "aggregation",
      },
      incident_intelligence: {
        fields: [
          { name: "ponto", type: "string", description: "Point type (ABRIGOS)" },
          { name: "filial", type: "string", filterable: true, description: "Branch" },
          { name: "bairro", type: "string", filterable: true, description: "Neighborhood (normalized/trimmed)" },
          { name: "ocorrencia", type: "string", filterable: true, description: "Occurrence type" },
          { name: "total", type: "number", description: "Total incident count" },
          { name: "percentual", type: "number", description: "Percentage of total (0-1 decimal)" },
        ],
        description: "Geographic and category analysis of maintenance issues with Top-N filtering",
        type: "aggregation",
      },
      service_level: {
        fields: [
          { name: "filial", type: "string", filterable: true, description: "Branch" },
          { name: "data", type: "string", description: "Ticket date" },
          { name: "semana", type: "string", filterable: true, description: "Week number" },
          { name: "origem", type: "string", filterable: true, description: "Source (SAC, COP, LIDIA)" },
          { name: "codEletro", type: "string", key: true, description: "Equipment code (joinable to main)" },
          { name: "primaryKey", type: "string", description: "Primary key from source" },
          { name: "equipamento", type: "string", description: "Equipment type" },
          { name: "ocorrencia", type: "string", description: "Issue type" },
          { name: "status", type: "string", filterable: true, description: "Ticket status (CONCLUIDO, PENDENTE)" },
          { name: "diasEmAberto", type: "number", description: "Days open (for pending tickets)" },
          { name: "sla", type: "string", description: "SLA information" },
          { name: "equipResumo", type: "string", description: "Equipment summary (ABRIGO, TOTEM)" },
        ],
        description: "SLA and resolution time tracking for SAC/COP service tickets with backlog metrics",
        type: "enrichment",
        backlogMetrics: {
          description: "Calculated metrics returned in response",
          fields: [
            { name: "backlog.totalPending", type: "number", description: "Total pending tickets" },
            { name: "backlog.avgDaysOpen", type: "number", description: "Average days open for pending" },
            { name: "backlog.byOrigem", type: "object", description: "Pending count by source" },
          ],
        },
      },
    },
    relationships: [
      { from: "main", to: "panels", via: "Nº Eletro", type: "1:1" },
      { from: "main", to: "abrigoamigo", via: "Nº Parada", type: "1:1" },
      { from: "main", to: "service_level", via: "codEletro", type: "1:many", description: "One equipment can have multiple service tickets" },
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
  
  // Add security info to response (v5.4.0)
  if (params.authInfo) {
    response.meta.security = {
      authenticated: true,
      keyName: params.authInfo.keyName,
      hmacVerified: params.authInfo.hmacVerified,
      rateLimitRemaining: params.authInfo.remaining
    };
    
    // Add warning during grace mode
    if (params.authInfo.graceMode && params.authInfo.warning) {
      response.meta.security.warning = params.authInfo.warning;
      response.meta.security.authenticated = false;
    }
  }

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
  var docs = `# API de Ativos - Documentação v5.4.0

## URL Base
\`https://script.google.com/macros/s/AKfycbzXpzgaA64P147rIqeaLEkCZ4YQcz5rJOn89Ag8Pf3p8EIg0Beisa9dS0OL-UEOsIWL/exec\`

## Novidades v5.4.0 - Segurança
- **API Key Authentication**: Autenticação via chave de API
- **HMAC-SHA256 Signing**: Assinatura de requisições para integridade
- **Per-Key Rate Limiting**: Limites de taxa por chave de API
- **Grace Mode**: Período de migração - chave recomendada mas não obrigatória
- Novo endpoint: \`?meta=security\` para documentação de segurança

## Autenticação (v5.4.0)

### Modo Simples (API Key)
\`\`\`
?apikey=SUA_CHAVE&limit=100
\`\`\`

### Modo HMAC (Recomendado)
\`\`\`
?apikey=SUA_CHAVE&timestamp=1704067200000&signature=abc123...&limit=100
\`\`\`

### Parâmetros de Segurança
| Parâmetro | Obrigatório | Descrição |
|-----------|-------------|-----------|
| apikey | Sim* | Chave de API |
| timestamp | Não | Timestamp em ms (para HMAC) |
| signature | Não | Assinatura HMAC-SHA256 |

*Durante o período de migração (Grace Mode), a chave é recomendada mas não obrigatória.

### Erros de Autenticação
| Código | Descrição |
|--------|-----------|
| 401 | Chave inválida, timestamp expirado, ou assinatura inválida |
| 403 | Chave suspensa ou origem não permitida |
| 429 | Limite de taxa excedido para esta chave |

## Novidades v5.3.0 - Operational Dashboard
- **maintenance_performance**: Acompanhamento semanal de preventivas com agregação
- **incident_intelligence**: Análise geográfica de ocorrências com filtro Top-N
- **service_level**: Tracking de SLA com métricas de backlog
- Novos filtros: semana, periodo, topN, ocorrencia, origem, statusTicket, codEletro, agregado
- Cache de 30 minutos para dados operacionais

## Novidades v5.2.0
- **Abrigo Amigo Layer**: Camada de segurança para mulheres (8PM-5AM)
- **abrigoAmigo**: Filtro para equipamentos com tecnologia Abrigo Amigo
- **cliente**: Filtro por patrocinador (Claro, Governo)

## Camadas de Dados (v5.4)
| layer | Descrição |
|-------|-----------|
| main | Dados principais (padrão) |
| panels | Apenas dados de painéis |
| abrigoamigo | Equipamentos com Abrigo Amigo |
| full | Main + Panels + Abrigo Amigo mesclados |
| summary | Main + contagens de painéis + Abrigo Amigo |
| maintenance_performance | Preventivas semanais por filial (v5.3) |
| incident_intelligence | Análise de ocorrências por bairro (v5.3) |
| service_level | Tickets SAC/COP com backlog (v5.3) |

## Introspection
| Parâmetro | Descrição |
|-----------|-----------|
| meta=layers | Lista camadas disponíveis |
| meta=version | Versão da API |
| meta=schema | Schema completo |
| meta=security | Documentação de segurança (v5.4) |

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

### Filtros Operational Dashboard (v5.3.0)
| Parâmetro | Descrição | Camadas |
|-----------|-----------|---------|
| semana | Filtrar por semana (01, 02, etc.) | maintenance_performance, service_level |
| periodo | Filtrar por bimestre (1BI ou 2BI) | maintenance_performance |
| topN | Top N ocorrências mais frequentes | incident_intelligence |
| ocorrencia | Filtrar por tipo de ocorrência | incident_intelligence |
| origem | Filtrar por origem (SAC, COP, LIDIA) | service_level |
| statusTicket | Filtrar por status (CONCLUIDO, PENDENTE) | service_level |
| codEletro | Filtrar por código do equipamento | service_level |
| agregado | Modo agregação (true/false) | maintenance_performance |

### Geoespacial
| Parâmetro | Descrição |
|-----------|-----------|
| lat | Latitude |
| lon | Longitude |
| radius | Raio em km (padrão: 5) |

### Outros
| Parâmetro | Descrição |
|-----------|-----------|
| layer | Camada de dados |
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

## Campos Operational Dashboard (v5.3.0)

### maintenance_performance
| Campo | Tipo | Descrição |
|-------|------|-----------|
| filial | string | Filial (FILIAL LESTE, FILIAL SUL, MATRIZ) |
| semana | string | Semana (01º SEMANA, etc.) |
| previsto | number | Manutenções previstas |
| concluido | number | Manutenções concluídas |
| pendente | number | Manutenções pendentes |
| percentRealizados | number | Taxa de conclusão (0-1) |
| periodo | string | Bimestre (1BI ou 2BI) |

### service_level
| Campo | Tipo | Descrição |
|-------|------|-----------|
| codEletro | string | Código do equipamento |
| origem | string | Origem (SAC, COP, LIDIA) |
| status | string | Status do ticket |
| diasEmAberto | number | Dias em aberto |
| backlog.totalPending | number | Total de tickets pendentes |
| backlog.avgDaysOpen | number | Média de dias em aberto |

## Exemplo de Resposta (Autenticado)
\`\`\`json
{
  "status": "success",
  "meta": { 
    "apiVersion": "5.4.0", 
    "layer": "main", 
    "count": 1000, 
    "total": 22038, 
    "cached": true,
    "security": {
      "authenticated": true,
      "keyName": "Radar Dashboard",
      "hmacVerified": true,
      "rateLimitRemaining": 95
    }
  },
  "data": [...]
}
\`\`\`

## Rate Limit
- Padrão: 100 requisições por minuto por chave
- Premium: 500 requisições por minuto
- Resposta 429 quando excedido
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
  <header class="header"><h1>API de Ativos</h1><span class="badge">v5.4.0 Segurança + Dashboard</span></header>
  <div class="container">
    <nav class="sidebar">
      <h3>Navegação</h3>
      <ul>
        <li><a href="#visao-geral">Visão Geral</a></li>
        <li><a href="#seguranca">Autenticação</a></li>
        <li><a href="#camadas">Camadas</a></li>
        <li><a href="#operational">Dashboard Operacional</a></li>
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
          <h4>Recursos v5.4</h4>
          <ul style="margin-left:20px;margin-top:12px">
            <li><strong>Autenticação via API Key</strong> - Segurança com HMAC-SHA256 (NOVO)</li>
            <li><strong>Camadas de dados</strong> - main, panels, abrigoamigo, full, summary</li>
            <li><strong>Dashboard Operacional</strong> - maintenance_performance, incident_intelligence, service_level</li>
            <li><strong>Dados de paineis</strong> - Contagem precisa</li>
            <li><strong>Abrigo Amigo</strong> - Iniciativa de segurança para mulheres</li>
            <li><strong>Métricas de SLA</strong> - Backlog, tempo médio de tickets</li>
            <li><strong>Meta introspection</strong> - ?meta=layers, ?meta=security</li>
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
      
      <section id="seguranca">
        <h2>Autenticação (v5.4.0)</h2>
        <p>A API agora suporta autenticação via API Key com assinatura HMAC-SHA256 opcional.</p>
        <div class="card highlight">
          <h4>Modo Grace (Migração)</h4>
          <p>Durante o período de migração, a API aceita requisições sem chave, mas retorna um aviso. <strong>Recomendamos adicionar a chave agora.</strong></p>
        </div>
        <h3>Modo Simples (API Key)</h3>
        <div class="code-tabs"><div class="tab-content active">
          <div class="code-header"><span class="code-lang">url</span></div>
          <pre><code>?apikey=SUA_CHAVE&limit=100</code></pre>
        </div></div>
        <h3>Modo HMAC (Recomendado)</h3>
        <div class="code-tabs"><div class="tab-content active">
          <div class="code-header"><span class="code-lang">url</span></div>
          <pre><code>?apikey=SUA_CHAVE&timestamp=1704067200000&signature=abc123...&limit=100</code></pre>
        </div></div>
        <h3>Parâmetros de Segurança</h3>
        <table>
          <thead><tr><th>Parâmetro</th><th>Obrigatório</th><th>Descrição</th></tr></thead>
          <tbody>
            <tr><td><code>apikey</code></td><td>Recomendado*</td><td>Sua chave de API</td></tr>
            <tr><td><code>timestamp</code></td><td>Para HMAC</td><td>Timestamp em ms (Date.now())</td></tr>
            <tr><td><code>signature</code></td><td>Para HMAC</td><td>HMAC-SHA256 dos parâmetros</td></tr>
          </tbody>
        </table>
        <p><small>* Obrigatório após período de migração</small></p>
        <h3>Códigos de Erro</h3>
        <table>
          <thead><tr><th>Código</th><th>Descrição</th></tr></thead>
          <tbody>
            <tr><td><code>401</code></td><td>Chave inválida, timestamp expirado, ou assinatura inválida</td></tr>
            <tr><td><code>403</code></td><td>Chave suspensa ou origem não permitida</td></tr>
            <tr><td><code>429</code></td><td>Limite de taxa excedido para esta chave</td></tr>
          </tbody>
        </table>
        <div class="alert alert-info"><span>💡</span><span>Use <code>?meta=security</code> para documentação completa de segurança</span></div>
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
            <tr><td><code>maintenance_performance</code></td><td>Métricas de manutenção preventiva (Dashboard Operacional)</td></tr>
            <tr><td><code>incident_intelligence</code></td><td>Tipos de ocorrências por bairro (Dashboard Operacional)</td></tr>
            <tr><td><code>service_level</code></td><td>Tickets SAC/COP e backlog (Dashboard Operacional)</td></tr>
          </tbody>
        </table>
        <h3>Introspection</h3>
        <p>Use <code>?meta=layers</code> para descobrir camadas disponíveis.</p>
      </section>
      
      <section id="operational">
        <h2>Dashboard Operacional</h2>
        <p>Três novas camadas para métricas operacionais e análise de performance.</p>
        <div class="card highlight">
          <h4>Novo em v5.3.0</h4>
          <ul style="margin-left:20px;margin-top:12px">
            <li><strong>maintenance_performance</strong> - Manutenção preventiva 1º/2º BI 2025</li>
            <li><strong>incident_intelligence</strong> - Tipos de ocorrências por bairro</li>
            <li><strong>service_level</strong> - Tickets SAC/COP com métricas de backlog</li>
          </ul>
        </div>
        <h3>Filtros Operacionais</h3>
        <table>
          <thead><tr><th>Parâmetro</th><th>Camadas</th><th>Descrição</th></tr></thead>
          <tbody>
            <tr><td><code>filial</code></td><td>maintenance_performance</td><td>Filtrar por filial (ex: SP)</td></tr>
            <tr><td><code>semana</code></td><td>maintenance_performance</td><td>Filtrar por semana (ex: S17)</td></tr>
            <tr><td><code>periodo</code></td><td>maintenance_performance</td><td>Período bianual: 1BI ou 2BI</td></tr>
            <tr><td><code>agregado</code></td><td>maintenance_performance</td><td>Agrupar dados por FILIAL+periodo (true/false)</td></tr>
            <tr><td><code>topN</code></td><td>incident_intelligence</td><td>Top N tipos de ocorrência mais frequentes</td></tr>
            <tr><td><code>ocorrencia</code></td><td>incident_intelligence</td><td>Filtrar por tipo de ocorrência</td></tr>
            <tr><td><code>origem</code></td><td>service_level</td><td>Filtrar por origem (SAC, COP)</td></tr>
            <tr><td><code>statusTicket</code></td><td>service_level</td><td>Status do ticket (PENDENTE, RESOLVIDO)</td></tr>
            <tr><td><code>codEletro</code></td><td>service_level</td><td>Filtrar por código eletro (join com main)</td></tr>
          </tbody>
        </table>
        <h3>Exemplos de Uso</h3>
        <div class="code-tabs"><div class="tab-content active">
          <div class="code-header"><span class="code-lang">bash</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div>
          <pre><code class="language-bash"># Dados de manutenção preventiva
curl "` +
    ScriptApp.getService().getUrl() +
    `?docs=false&layer=maintenance_performance"

# Dados agregados por filial
curl "` +
    ScriptApp.getService().getUrl() +
    `?docs=false&layer=maintenance_performance&agregado=true"

# Top 10 tipos de ocorrência
curl "` +
    ScriptApp.getService().getUrl() +
    `?docs=false&layer=incident_intelligence&topN=10"

# Tickets pendentes
curl "` +
    ScriptApp.getService().getUrl() +
    `?docs=false&layer=service_level&statusTicket=PENDENTE"</code></pre>
        </div></div>
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
        <p>© 2026 Eletromidia - API de Ativos v5.4.0</p>
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
