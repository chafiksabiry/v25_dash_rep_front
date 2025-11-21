// frontend/src/utils/client.tsx
import axios from 'axios';

// Use Vite environment variables (instead of process.env)
console.log("API_URL", import.meta.env.VITE_API_URL);
console.log("REP_API_URL", import.meta.env.VITE_REP_API_URL);
console.log("CALLS_API_URL", import.meta.env.VITE_CALLS_API_URL);
console.log("DASHBOARD_COMPANY_API_URL", import.meta.env.VITE_DASHBOARD_COMPANY_API_URL);

const API_URL = import.meta.env.VITE_API_URL;
const REP_API_URL = import.meta.env.VITE_REP_API_URL;
const CALLS_API_URL = import.meta.env.VITE_CALLS_API_URL;
const DASHBOARD_COMPANY_API_URL = import.meta.env.VITE_DASHBOARD_COMPANY_API_URL;

// Create axios instances with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a separate axios instance for REP API (profiles)
const repApiClient = axios.create({
  baseURL: REP_API_URL,
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

const dashboardCompanyApiClient = axios.create({
  baseURL: DASHBOARD_COMPANY_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
const addAuthInterceptor = (axiosInstance: any) => {
  axiosInstance.interceptors.request.use(
    (config: any) => {
      const runMode = import.meta.env.VITE_RUN_MODE || 'in-app';
      let token;
      // Determine userId based on run mode
      if (runMode === 'standalone') {
        console.log("🔑 Running in standalone mode");
        // Use static userId from environment variable in standalone mode
        token = import.meta.env.VITE_STANDALONE_TOKEN;

        console.log("🔑 Using static token from env:", token);
      } else {
        console.log("🔑 Running in in-app mode");
        // Use userId from cookies in in-app mode
        token = localStorage.getItem('token');
        console.log("🔑 token from localStorage:", token);
        console.log("🔑 Verified saved token from localStorage:", token);
      }
      console.log("🔑 Token from client.js addAuthInterceptor:", token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("✅ Authorization header set:", config.headers.Authorization);
      } else {
        console.warn("⚠️ No token found - request will be made without authentication");
      }
      console.log("🌐 Making request to:", config.baseURL + config.url);
      return config;
    },
    (error: any) => {
      console.error("❌ Request interceptor error:", error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for better error handling
  axiosInstance.interceptors.response.use(
    (response: any) => {
      console.log("✅ API Response successful:", response.config.url, response.status);
      return response;
    },
    (error: any) => {
      console.error("❌ API Response error:", {
        url: error.config?.url,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      });
      
      if (error.response?.status === 401) {
        console.warn("🔐 Unauthorized - token may be expired or invalid");
        // Optionally clear token and redirect to login
        // localStorage.removeItem('token');
        // window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
  );


};

// Add auth interceptors to all instances
addAuthInterceptor(apiClient);
addAuthInterceptor(repApiClient);
addAuthInterceptor(callsApiClient);
addAuthInterceptor(dashboardCompanyApiClient);

// API interfaces
export interface Call {
  _id: string;
  call_id?: string;
  agent: Agent;
  lead?: Lead;
  sid?: string;
  parentCallSid?: string | null;
  direction: 'inbound' | 'outbound-dial';
  provider?: 'twilio';
  startTime: Date;
  endTime?: Date | null;
  status: string;
  duration: number;
  recording_url?: string;
  recording_url_cloudinary?: string;
  quality_score?: number;
  ai_call_score?: {
    'Agent fluency': {
      score: number;
      feedback: string;
    };
    'Sentiment analysis': {
      score: number;
      feedback: string;
    };
    'Fraud detection': {
      score: number;
      feedback: string;
    };
    overall: {
      score: number;
      feedback: string;
    };
  };
  childCalls?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Lead {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  value: number;
  probability: number;
  source?: string;
  assignedTo?: string;
  lastContact?: Date;
  nextAction?: 'call' | 'email' | 'meeting' | 'follow-up';
  notes?: string;
  metadata?: {
    ai_analysis?: {
      score?: number;
      sentiment?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}


export interface Agent {
  _id: string;
  personalInfo: {
    name: string;
  };
}

// API methods
export const callsApi = {
  getByAgentId: async (agentId: string) => {
    const response = await callsApiClient.get(`/api/calls/agent/${agentId}`);
    return response.data;
  },
  update: async (id: string, data: Partial<Call>) => {
    const response = await callsApiClient.put(`/api/calls/${id}`, data);
    return response.data;
  },
};

export const vertexApi = {
  getCallScoring: async (data: Object) => {
    const response = await dashboardCompanyApiClient.post('/vertex/call/score', data);
    return response.data;
  },
  getCallTranscription: async (data: Object) => {
    const response = await dashboardCompanyApiClient.post('/vertex/audio/transcribe', data);
    return response.data;
  },
  getCallSummary: async (data: Object) => {
    const response = await dashboardCompanyApiClient.post('/vertex/audio/summarize', data);
    return response.data;
  },
  getCallPostActions: async (data: Object) => {
    const response = await dashboardCompanyApiClient.post('/vertex/call/post-actions', data);
    return response.data;
  }
};

export const authApi = {
  login: (credentials: { email: string, password: string }) =>
    apiClient.post('/api/auth/login', credentials),
  register: (userData: { email: string, password: string, [key: string]: any }) =>
    apiClient.post('/api/auth/register', userData),
  refreshToken: () => apiClient.post('/api/auth/refresh'),
};

export const profileApi = {
  get: () => repApiClient.get('/api/profiles'),
  getById: (id: string) => repApiClient.get(`/api/profiles/${id}`),
  update: (profileId: string, data: any) => repApiClient.put(`/api/profiles/${profileId}`, data),
  updateBasicInfo: (id: string, basicInfo: any) => repApiClient.put(`/api/profiles/${id}/basic-info`, basicInfo),
  updateExperience: (id: string, experience: any) => repApiClient.put(`/api/profiles/${id}/experience`, { experience }),
  updateSkills: (id: string, skills: any) => repApiClient.put(`/api/profiles/${id}/skills`, { skills }),
  getPlan: (profileId: string) => repApiClient.get(`/api/profiles/${profileId}/plan`),
};

// Export the API client for direct use
export { repApiClient };

// Default export with all APIs
export default {
  calls: callsApi,
  vertex: vertexApi,
  auth: authApi,
  profile: profileApi,
};