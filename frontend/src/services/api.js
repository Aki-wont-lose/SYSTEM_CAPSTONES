import axios from 'axios';
import { getToken, clearSession } from './session';

// On Vercel the API is a serverless function on the same domain, so requests stay
// same-origin under /api. Local development keeps using the dev backend.
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

// Shared axios instance used by every service module.
// The timeout matters: without one a stalled serverless request left the UI
// spinning forever. Individual polling calls pass a shorter timeout.
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach token to every request (session-scoped: gone when the browser closes)
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// In-memory cache for GET requests: cacheKey -> { response, timestamp }
const responseCache = new Map();
// In-flight request promises for deduplication: cacheKey -> Promise
const inFlightRequests = new Map();

// Default cache TTL: 30 seconds for GET requests
const DEFAULT_TTL_MS = 30000;

export const clearApiCache = (prefix = '') => {
  if (!prefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.includes(prefix)) {
      responseCache.delete(key);
    }
  }
};

// Wrap api.get with caching and request deduplication
const originalGet = api.get.bind(api);
api.get = (url, config = {}) => {
  // If cache is explicitly disabled, bypass cache
  if (config.skipCache || config.params?.noCache) {
    return originalGet(url, config);
  }

  const cacheKey = `${url}?${JSON.stringify(config.params || {})}`;
  const ttl = config.cacheTTL ?? DEFAULT_TTL_MS;
  const now = Date.now();

  const cached = responseCache.get(cacheKey);
  if (cached && (now - cached.timestamp < ttl)) {
    return Promise.resolve({
      ...cached.response,
      fromCache: true
    });
  }

  // Deduplicate identical in-flight GET requests
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const reqPromise = originalGet(url, config)
    .then((res) => {
      if (res && res.status >= 200 && res.status < 300) {
        responseCache.set(cacheKey, {
          response: {
            data: res.data,
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
            config: res.config
          },
          timestamp: Date.now()
        });
      }
      return res;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, reqPromise);
  return reqPromise;
};

// Automatic cache invalidation on any mutations (POST, PUT, PATCH, DELETE)
const mutationMethods = ['post', 'put', 'patch', 'delete'];
for (const method of mutationMethods) {
  const originalMethod = api[method].bind(api);
  api[method] = async (url, ...args) => {
    try {
      const result = await originalMethod(url, ...args);
      // Invalidate cache immediately on successful mutation to prevent stale data
      clearApiCache();
      return result;
    } catch (err) {
      throw err;
    }
  };
}

// Handle expired/invalid tokens globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
      clearApiCache();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
