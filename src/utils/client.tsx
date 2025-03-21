// frontend/src/utils/client.tsx
import axios from 'axios';

// Use Vite environment variables (instead of process.env)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
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

// API methods
const api = {
  // Profile endpoints
  profile: {
    get: () => apiClient.get('/profile'),
    getById: (id: string) => apiClient.get(`/profile/user/${id}`),
    update: (data: any) => apiClient.put('/profile', data),
  },
  
  // Auth endpoints 
  auth: {
    login: (credentials: {email: string, password: string}) => apiClient.post('/auth/login', credentials),
    register: (userData: {email: string, password: string, [key: string]: any}) => apiClient.post('/auth/register', userData),
    refreshToken: () => apiClient.post('/auth/refresh'),
  },
  
  // Add more API endpoints as needed
};

export default api;