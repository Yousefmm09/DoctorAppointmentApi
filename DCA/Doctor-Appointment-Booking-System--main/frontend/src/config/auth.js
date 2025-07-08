/**
 * Authentication Configuration
 * Contains configuration settings for authentication features
 */

// JWT Authentication configuration
export const jwtAuthConfig = {
  // Token storage key
  tokenKey: "token",
  
  // User role storage key
  roleKey: "userRole",
  
  // JWT expiration time in milliseconds (default: 24 hours)
  // This is used for client-side token refresh timing
  tokenExpirationTime: 24 * 60 * 60 * 1000,
  
  // Whether to store token in localStorage (true) or sessionStorage (false)
  persistentStorage: true
};

// Authentication endpoints
export const authEndpoints = {
  login: "/api/Account/login",
  register: "/api/Account/Registration/patient",
  doctorRegister: "/api/Account/registration/doctor",
  refreshToken: "/api/Account/refresh-token",
  validateToken: "/api/Account/validate-token"
};

// Default export with all auth configuration
export default {
  jwt: jwtAuthConfig,
  endpoints: authEndpoints
}; 