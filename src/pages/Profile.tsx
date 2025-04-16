import React, { useState, useEffect } from 'react';
import { ProfileView } from '../components/ProfileView';
import { profileApi } from '../utils/client.tsx';
import Cookies from 'js-cookie';

// Define a type for your profile data
interface ProfileData {
  _id: string;
  userId: string;
  status: string;
  completionSteps: {
    basicInfo: boolean;
    experience: boolean;
    skills: boolean;
    languages: boolean;
    assessment: boolean;
  };
  personalInfo: {
    name: string;
    location?: string;
    email: string;
    phone?: string;
    languages: Array<{
      language: string;
      proficiency: string;
      assessmentResults?: {
        completeness: {
          score: number;
          feedback: string;
        };
        fluency: {
          score: number;
          feedback: string;
        };
        proficiency: {
          score: number;
          feedback: string;
        };
        overall: {
          score: number;
          strengths: string;
          areasForImprovement: string;
        };
        completedAt: string;
      };
    }>;
  };
  professionalSummary: {
    yearsOfExperience: string;
    currentRole?: string;
    industries?: string[];
    keyExpertise?: string[];
    notableCompanies?: string[];
    profileDescription?: string;
  };
  skills: {
    technical: Array<{
      skill: string;
      level: number;
      details?: string;
    }>;
    professional: Array<{
      skill: string;
      level: number;
      details?: string;
    }>;
    soft: Array<{
      skill: string;
      level: number;
      details?: string;
    }>;
    contactCenter: Array<{
      skill: string;
      category: string;
      proficiency: string;
      assessmentResults: {
        score: number;
        strengths: string[];
        improvements: string[];
        feedback: string;
        tips: string[];
        keyMetrics: {
          professionalism: number;
          effectiveness: number;
          customerFocus: number;
        };
        completedAt: string;
      };
    }>;
  };
  experience: Array<{
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    responsibilities?: string[];
    achievements?: string[];
  }>;
  lastUpdated: string;
}

export function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userId = Cookies.get('userId');

        if (!userId) {
          throw new Error('User ID not found in cookies');
        }

        try {
          const response = await profileApi.getById(userId);
          const profileData = response.data.data;
          
          // Add detailed logging
          console.log('Raw Profile Data:', profileData);

          if (profileData._id) {
            localStorage.setItem('agentId', profileData._id);
          }

          setProfile(profileData);
          setLoading(false);
        } catch (idError) {
          console.error('Error fetching by ID, trying default endpoint:', idError);
          const response = await profileApi.get();
          const profileData = response.data;

          // Add detailed logging for fallback response
          console.log('Fallback Profile Data:', {
            fullData: profileData,
            id: profileData._id,
            personalInfo: profileData.personalInfo,
            experience: profileData.experience,
            skills: profileData.skills,
            professionalSummary: profileData.professionalSummary
          });

          if (profileData._id) {
            localStorage.setItem('agentId', profileData._id);
          }

          setProfile(profileData);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error fetching profile:', err);

        if (err.response) {
          setError(`Server error: ${err.response.status} - ${err.response.statusText}`);
        } else if (err.request) {
          setError('Network error. Please check your connection and ensure the backend server is running.');
        } else {
          setError(err.message || 'Failed to load profile');
        }

        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-lg text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-lg text-gray-600">No profile data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <ProfileView profile={profile} />
      </div>
    </div>
  );
}