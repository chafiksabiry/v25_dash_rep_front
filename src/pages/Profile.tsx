import React, { useState, useEffect } from 'react';
import { ProfileView } from '../components/ProfileView';
import { getProfileData } from '../utils/profileUtils';

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
      iso639_1?: string;
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
  console.log('🧩 Profile component initializing');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('📋 Profile component mounted - loading profile data');
    
    const loadProfile = async () => {
      console.log('🔄 Starting profile data loading process');
      try {
        console.log('🔍 Requesting profile data through getProfileData utility');
        const profileData = await getProfileData();
        console.log('✅ Profile data received successfully');
        console.log('💽 Setting profile data in component state');
        setProfile(profileData);
        setLoading(false);
      } catch (err: any) {
        console.error('❌ Error loading profile:', err);
        setError(err.message || 'Failed to load profile');
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    console.log('⏳ Profile is in loading state, showing loading screen');
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-lg text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    console.log('❌ Profile has error state, showing error message');
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!profile) {
    console.log('⚠️ No profile data available');
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-lg text-gray-600">No profile data available</div>
      </div>
    );
  }

  console.log('🖥️ Rendering profile view with data');
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <ProfileView profile={profile} />
      </div>
    </div>
  );
}