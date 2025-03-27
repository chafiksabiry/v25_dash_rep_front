// frontend/src/utils/client.tsx
import axios from 'axios';

// Use Vite environment variables (instead of process.env)
console.log("API_URL", import.meta.env.VITE_API_URL);
console.log("CALLS_API_URL", import.meta.env.VITE_CALLS_API_URL);
console.log("DASHBOARD_COMPANY_API_URL", import.meta.env.VITE_DASHBOARD_COMPANY_API_URL);

const API_URL = import.meta.env.VITE_API_URL;
const CALLS_API_URL = import.meta.env.VITE_CALLS_API_URL;
const DASHBOARD_COMPANY_API_URL = import.meta.env.VITE_DASHBOARD_COMPANY_API_URL;
// Create axios instances with default config
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
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: any) => {
      return Promise.reject(error);
    }
  );

  axiosInstance.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
      }
      return Promise.reject(error);
    }
  );
};

// Add auth interceptors to all instances
addAuthInterceptor(apiClient);
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
  provider?: 'twilio' | 'qalqul';
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
  login: (credentials: {email: string, password: string}) => 
    apiClient.post('/api/auth/login', credentials),
  register: (userData: {email: string, password: string, [key: string]: any}) => 
    apiClient.post('/api/auth/register', userData),
  refreshToken: () => apiClient.post('/api/auth/refresh'),
};

export const profileApi = {
  get: () => apiClient.get('/api/profile'),
  getById: (id: string) => apiClient.get(`/api/profile/user/${id}`),
  update: (profileId: string, data: any) => apiClient.put(`/api/profile/${profileId}`, data),
};

// Default export with all APIs
export default {
  calls: callsApi,
  vertex: vertexApi,
  auth: authApi,
  profile: profileApi,
};