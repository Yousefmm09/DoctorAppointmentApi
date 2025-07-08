/**
 * Environment configuration for the application
 * This centralizes all environment-specific settings
 */

const ENV = import.meta.env.VITE_APP_ENV || 'development';

// Base URLs for different environments
const API_URLS = {
  development: 'http://localhost:5109',
  test: 'http://localhost:5109',
  production: window.location.origin, // Uses the same origin in production
};

// Default request timeout in milliseconds
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Default pagination settings
const DEFAULT_PAGE_SIZE = 10;

// Auth token configuration
const TOKEN_CONFIG = {
  storageKey: 'token',
  userRoleKey: 'userRole',
  userDataKey: 'userData',
};

// WebSocket configuration
const WEBSOCKET_CONFIG = {
  reconnectInterval: 2000, // Reconnect every 2 seconds
  maxReconnectAttempts: 5,
};

// Export combined configuration
const config = {
  env: ENV,
  isDevelopment: ENV === 'development',
  isProduction: ENV === 'production',
  apiUrl: API_URLS[ENV] || API_URLS.development,
  timeout: DEFAULT_TIMEOUT,
  pagination: {
    defaultPageSize: DEFAULT_PAGE_SIZE,
  },
  auth: TOKEN_CONFIG,
  websocket: WEBSOCKET_CONFIG,
  
  // Helper function to build API paths
  apiPath: (path) => {
    const basePath = `${API_URLS[ENV] || API_URLS.development}/api`;
    return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
  },
  
  // Helper function to build WebSocket paths
  wsPath: (path) => {
    const baseUrl = API_URLS[ENV] || API_URLS.development;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = baseUrl.replace(/^https?:\/\//, '');
    return `${protocol}//${host}${path.startsWith('/') ? path : `/${path}`}`;
  }
};

export default config; 