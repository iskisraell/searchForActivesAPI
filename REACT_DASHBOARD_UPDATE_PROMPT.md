# AI Agent Prompt: Update Radar Dashboard for API Security v5.4.0

## Context

The Search for Actives API (Google Apps Script) has been updated to v5.4.0 with a new security layer. You need to update the React/Vite dashboard at https://github.com/iskisraell/eletro-encontrar-ativos to support API Key authentication with optional HMAC-SHA256 request signing.

## Current State

The dashboard currently:
- Calls the API directly without authentication
- Has the API URL hardcoded in `services/api.ts`
- Uses native `fetch()` for HTTP requests
- Has no environment variables for API credentials

## Target State

After your changes:
- API Key passed with every data request
- Optional HMAC-SHA256 signature for request integrity
- Environment variables for API credentials
- Graceful error handling for 401/403/429 responses
- Works in both development (localhost) and production (Vercel)

---

## CRITICAL: Files to Modify

| File | Changes Required |
|------|------------------|
| `services/api.ts` | Add auth parameters, use env vars |
| `vite.config.ts` | Expose VITE_API_KEY and VITE_API_SECRET |
| `.env.local` | Create with development credentials |
| `.env.example` | Create template for other developers |
| `.gitignore` | Ensure `.env.local` is ignored |
| `types.ts` | Add AuthError type |
| `vercel.json` | Document env vars needed |

---

## Step-by-Step Implementation

### 1. Create Environment Variable Template

Create `.env.example`:
```env
# API Configuration
VITE_API_URL=https://script.google.com/macros/s/AKfycbzXpzgaA64P147rIqeaLEkCZ4YQcz5rJOn89Ag8Pf3p8EIg0Beisa9dS0OL-UEOsIWL/exec
VITE_API_KEY=your-api-key-here
VITE_API_SECRET=your-api-secret-here

# Optional: Set to 'simple' for API key only, 'hmac' for full security
VITE_AUTH_MODE=hmac
```

### 2. Update `.gitignore`

Add if not present:
```
.env.local
.env.*.local
```

### 3. Update `vite.config.ts`

```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      // Expose environment variables to the client
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'import.meta.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY),
      'import.meta.env.VITE_API_SECRET': JSON.stringify(env.VITE_API_SECRET),
      'import.meta.env.VITE_AUTH_MODE': JSON.stringify(env.VITE_AUTH_MODE || 'simple'),
    },
  };
});
```

### 4. Add Auth Error Type to `types.ts`

```typescript
export class AuthError extends Error {
  code: number;
  
  constructor(message: string, code: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}
```

### 5. Create Auth Utility (`services/auth.ts`)

```typescript
/**
 * API Authentication Utility for Ativos API v5.4.0
 * Supports both simple API key and HMAC-SHA256 signed requests
 */

const API_KEY = import.meta.env.VITE_API_KEY || '';
const API_SECRET = import.meta.env.VITE_API_SECRET || '';
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'simple';

/**
 * Compute HMAC-SHA256 signature using Web Crypto API
 */
async function computeHmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Add authentication parameters to URL
 * @param url - The URL object to add auth params to
 * @returns Promise that resolves when auth params are added
 */
export async function addAuthParams(url: URL): Promise<void> {
  if (!API_KEY) {
    console.warn('No API key configured. Requests may be rejected.');
    return;
  }
  
  // Always add API key
  url.searchParams.set('apikey', API_KEY);
  
  // Add HMAC signature if in hmac mode and secret is available
  if (AUTH_MODE === 'hmac' && API_SECRET) {
    const timestamp = Date.now().toString();
    url.searchParams.set('timestamp', timestamp);
    
    // Build string to sign: all params sorted alphabetically (except signature)
    const sortedParams = Array.from(url.searchParams.entries())
      .filter(([key]) => key !== 'signature')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    const signature = await computeHmacSha256(API_SECRET, sortedParams);
    url.searchParams.set('signature', signature);
  }
}

/**
 * Check if auth credentials are configured
 */
export function isAuthConfigured(): boolean {
  return !!API_KEY;
}

/**
 * Get current auth mode
 */
export function getAuthMode(): 'simple' | 'hmac' | 'none' {
  if (!API_KEY) return 'none';
  if (AUTH_MODE === 'hmac' && API_SECRET) return 'hmac';
  return 'simple';
}
```

### 6. Update `services/api.ts`

Replace the current implementation with:

```typescript
import { Equipment, ApiResponse, SearchParams } from '../types';
import { RateLimitError, AuthError } from '../types';
import { addAuthParams, isAuthConfigured } from './auth';

// Use environment variable, fallback to hardcoded for migration
const API_BASE = import.meta.env.VITE_API_URL || 
  "https://script.google.com/macros/s/AKfycbzXpzgaA64P147rIqeaLEkCZ4YQcz5rJOn89Ag8Pf3p8EIg0Beisa9dS0OL-UEOsIWL/exec";

/**
 * Fetch equipment data from API with authentication
 */
export const fetchEquipment = async (params: SearchParams): Promise<{
  data: Equipment[];
  total: number;
  cached?: boolean;
  security?: {
    authenticated: boolean;
    warning?: string;
  };
}> => {
  const url = new URL(API_BASE);
  
  // Required: docs=false to get JSON instead of documentation
  url.searchParams.append('docs', 'false');
  
  // Add query parameters
  if (params.layer) url.searchParams.append('layer', params.layer);
  if (params.q) url.searchParams.append('q', params.q);
  if (params.start !== undefined) url.searchParams.append('start', params.start.toString());
  if (params.limit !== undefined) url.searchParams.append('limit', params.limit.toString());
  if (params.status) url.searchParams.append('status', params.status);
  if (params.cidade) url.searchParams.append('cidade', params.cidade);
  if (params.estado) url.searchParams.append('estado', params.estado);
  if (params.bairro) url.searchParams.append('bairro', params.bairro);
  if (params.area) url.searchParams.append('area', params.area);
  if (params.praca) url.searchParams.append('praca', params.praca);
  if (params.filial) url.searchParams.append('filial', params.filial);
  if (params.neletro) url.searchParams.append('neletro', params.neletro);
  if (params.nparada) url.searchParams.append('nparada', params.nparada);
  if (params.endereco) url.searchParams.append('endereco', params.endereco);
  if (params.hasDigital !== undefined) url.searchParams.append('hasDigital', params.hasDigital.toString());
  if (params.hasStatic !== undefined) url.searchParams.append('hasStatic', params.hasStatic.toString());
  if (params.modelo) url.searchParams.append('modelo', params.modelo);
  if (params.abrigoAmigo !== undefined) url.searchParams.append('abrigoAmigo', params.abrigoAmigo.toString());
  if (params.cliente) url.searchParams.append('cliente', params.cliente);
  if (params.nocache) url.searchParams.append('nocache', 'true');
  
  // Geospatial params
  if (params.lat !== undefined) url.searchParams.append('lat', params.lat.toString());
  if (params.lon !== undefined) url.searchParams.append('lon', params.lon.toString());
  if (params.radius !== undefined) url.searchParams.append('radius', params.radius.toString());

  // ADD AUTHENTICATION (v5.4.0)
  await addAuthParams(url);

  const response = await fetch(url.toString());
  const result: ApiResponse = await response.json();

  // Handle authentication errors
  if (result.status === 'error') {
    if (result.code === 401) {
      throw new AuthError(result.message || 'Authentication failed', 401);
    }
    if (result.code === 403) {
      throw new AuthError(result.message || 'Access forbidden', 403);
    }
    if (result.code === 429) {
      throw new RateLimitError(result.meta?.retryAfter || 60);
    }
    throw new Error(result.message || 'API Error');
  }

  // Log security warning if in grace mode
  if (result.meta?.security?.warning) {
    console.warn('API Security Warning:', result.meta.security.warning);
  }

  return {
    data: result.data,
    total: result.total,
    cached: result.meta?.cached,
    security: result.meta?.security
  };
};

/**
 * Fetch with automatic retry on rate limit
 */
export const fetchWithRetry = async (
  params: SearchParams,
  maxRetries = 3
): Promise<ReturnType<typeof fetchEquipment>> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchEquipment(params);
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof RateLimitError) {
        console.warn(`Rate limited. Waiting ${error.retryAfter}s before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
        continue;
      }
      
      // Don't retry auth errors
      if (error instanceof AuthError) {
        throw error;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
};

// Layer-specific fetch functions remain the same...
export const fetchPanelsLayer = async (params: SearchParams = {}) => {
  return fetchEquipment({ ...params, layer: 'panels' });
};

export const fetchMainLayer = async (params: SearchParams = {}) => {
  return fetchEquipment({ ...params, layer: 'main' });
};
```

### 7. Update `types.ts`

Add these new types:

```typescript
export class AuthError extends Error {
  code: number;
  
  constructor(message: string, code: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

// Update ApiResponse to include security metadata
export interface ApiResponse {
  status: 'success' | 'error';
  code?: number;
  message?: string;
  data: Equipment[];
  total: number;
  count: number;
  meta?: {
    apiVersion: string;
    layer: string;
    cached: boolean;
    cacheExpires: string;
    executionTimeMs: number;
    retryAfter?: number;
    security?: {
      authenticated: boolean;
      keyName?: string;
      hmacVerified?: boolean;
      rateLimitRemaining?: number;
      warning?: string;
    };
  };
  links?: {
    self: string;
    next?: string;
    prev?: string;
    first: string;
    last: string;
  };
}
```

---

## Environment Variables for Vercel

After getting the API key from the Apps Script project owner, add these to Vercel:

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add:
   - `VITE_API_URL` = `https://script.google.com/macros/s/AKfycbz.../exec`
   - `VITE_API_KEY` = `eletro-radar-dashboard` (the key ID)
   - `VITE_API_SECRET` = `<secret from setupRadarDashboardKey()>`
   - `VITE_AUTH_MODE` = `hmac` (or `simple` for API key only)

---

## Getting the API Key

The API administrator needs to run this in the Apps Script editor:

```javascript
// Run setupRadarDashboardKey() in the Script Editor
// Copy the output:
// - API Key: eletro-radar-dashboard
// - Secret: <generated secret>
```

---

## Testing Checklist

After implementation, verify:

- [ ] App loads without errors in development (`npm run dev`)
- [ ] Console shows no auth warnings when key is configured
- [ ] API requests include `apikey` parameter
- [ ] API requests include `timestamp` and `signature` (if HMAC mode)
- [ ] 401 errors are caught and displayed to user
- [ ] 429 rate limit errors trigger retry logic
- [ ] App works in production (Vercel deployment)

---

## Error Handling UI (Optional but Recommended)

Add a toast or alert when auth fails:

```tsx
// In App.tsx or wherever you handle API errors
import { useToast } from './contexts/ToastContext';

// In your fetch error handler:
if (error instanceof AuthError) {
  if (error.code === 401) {
    toast.error('API authentication failed. Please contact support.');
  } else if (error.code === 403) {
    toast.error('API access denied. Your key may be suspended.');
  }
}
```

---

## Migration Notes

1. The API is currently in **Grace Mode** - requests without API key will still work but return a warning
2. Grace Mode will be disabled in future versions, making API key required
3. Start with `VITE_AUTH_MODE=simple` for easier debugging, switch to `hmac` for production

---

## Summary

| Environment | VITE_AUTH_MODE | Security Level |
|------------|----------------|----------------|
| Development | simple | API key only - easier to debug |
| Production | hmac | Full HMAC signing - tamper-proof |

The implementation should take approximately 30-60 minutes and requires no backend changes - all authentication is done client-side with the API key and secret.
