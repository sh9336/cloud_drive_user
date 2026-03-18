// Environment configuration with validation
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Validate required environment variables
if (!API_BASE_URL) {
  throw new Error(
    'VITE_API_BASE_URL environment variable is not set. Please check your .env file.'
  );
}

// Warn if using localhost in production-like environment
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && API_BASE_URL.includes('localhost')) {
  console.warn('⚠️ Using localhost API URL in non-local environment. This may cause CORS errors.');
}

// Request timeout configuration (ms)
export const REQUEST_TIMEOUT = 30000; // 30 seconds

// Local storage with availability check
export const storage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      console.warn(`⚠️ localStorage is not available (private browsing?)`);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      console.warn(`⚠️ localStorage is not available (private browsing?)`);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      console.warn(`⚠️ localStorage is not available (private browsing?)`);
    }
  },
};

export { API_BASE_URL };
