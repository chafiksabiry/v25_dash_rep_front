// frontend/src/utils/client.tsx
import axios from 'axios';

// Use Vite environment variables (instead of process.env)
console.log("API_URL", import.meta.env.VITE_API_URL);
console.log("CALLS_API_URL", import.meta.env.VITE_CALLS_API_URL);

const API_URL = import.meta.env.VITE_API_URL;
const CALLS_API_URL = import.meta.env.VITE_CALLS_API_URL;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a separate axios instance for calls API
const callsApiClient = axios.create({
  baseURL: CALLS_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add the same interceptor for calls API
callsApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors (e.g., 401 unauthorized, 403 forbidden)
    if (error.response) {
      const { status } = error.response;
      
      if (status === 401) {
        // Redirect to login or clear token if unauthorized
        localStorage.removeItem('token');
        // You might want to redirect to login page here
        // window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Add the same response interceptor for calls API
callsApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;
      
      if (status === 401) {
        localStorage.removeItem('token');
      }
    }
    
    return Promise.reject(error);
  }
);

// API methods
const api = {
  // Profile endpoints
  profile: {
    get: () => apiClient.get('/api/profile'),
    getById: (id: string) => apiClient.get(`/api/profile/user/${id}`),
    update: (profileId: string, data: any) => apiClient.put(`/api/profile/${profileId}`, data),
  },
  
  // Auth endpoints 
  auth: {
    login: (credentials: {email: string, password: string}) => apiClient.post('/api/auth/login', credentials),
    register: (userData: {email: string, password: string, [key: string]: any}) => apiClient.post('/api/auth/register', userData),
    refreshToken: () => apiClient.post('/api/auth/refresh'),
  },

  // Calls endpoints
  calls: {
    getByAgentId: (agentId: string) => callsApiClient.get(`/api/calls/agent/${agentId}`),
  },
};

export default api;