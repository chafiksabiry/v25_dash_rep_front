import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL_GIGS || 'https://api-gigsmanual.harx.ai/api';

export interface Enrollment {
  id: string;
  gig: {
    _id: string;
    title: string;
    description: string;
    companyName: string;
    industry: string;
    requiredSkills: string[];
    preferredLanguages: string[];
    requiredExperience: number;
    expectedConversionRate: number;
    compensation: {
      base: number;
      commission: number;
    };
    duration: {
      startDate: string;
      endDate: string;
    };
    timezone: string;
    targetRegion: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  enrollmentStatus: 'invited' | 'accepted' | 'rejected' | 'expired';
  status: string;
  invitationSentAt: string;
  invitationExpiresAt: string;
  enrollmentDate?: string;
  enrollmentNotes?: string;
  canEnroll: boolean;
  isExpired: boolean;
  notes?: string;
  matchScore?: number;
  matchStatus?: string;
}

export const enrollmentApi = {
  // Récupérer les enrôlements d'un agent
  getAgentEnrollments: async (agentId: string, status?: string): Promise<{ count: number; enrollments: Enrollment[] }> => {
    try {
      const url = status 
        ? `${API_BASE_URL}/enrollment/agent/${agentId}?status=${status}`
        : `${API_BASE_URL}/enrollment/agent/${agentId}`;
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching agent enrollments:', error);
      throw error;
    }
  },

  // Accepter un enrôlement
  acceptEnrollment: async (enrollmentId: string, notes?: string): Promise<any> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/enrollment/${enrollmentId}/accept`, {
        notes: notes || ''
      });
      return response.data;
    } catch (error) {
      console.error('Error accepting enrollment:', error);
      throw error;
    }
  },

  // Refuser un enrôlement
  rejectEnrollment: async (enrollmentId: string, notes?: string): Promise<any> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/enrollment/${enrollmentId}/reject`, {
        notes: notes || ''
      });
      return response.data;
    } catch (error) {
      console.error('Error rejecting enrollment:', error);
      throw error;
    }
  },

  // Renvoyer une invitation
  resendInvitation: async (enrollmentId: string): Promise<any> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/enrollment/${enrollmentId}/resend`);
      return response.data;
    } catch (error) {
      console.error('Error resending invitation:', error);
      throw error;
    }
  }
};
