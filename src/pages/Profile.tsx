import { useState, useEffect } from 'react';
import { Skeleton } from '../components/ui/Skeleton';
import { ProfileView } from '../components/ProfileView';
import { ProfileEditView } from '../components/ProfileEditView';
import { getProfileData, updateProfileData } from '../utils/profileUtils';

// Import Timezone type from repWizard service
import { Timezone } from '../services/api/repWizard';

// Define a type for your profile data - Updated to match new schema
interface ProfileData {
  _id: string;
  userId: string;
  status: string;
  // Updated to new onboarding progress structure
  onboardingProgress?: {
    currentPhase: number;
    overallCompletion: number;
    phases: {
      [key: string]: {
        status: 'pending' | 'in_progress' | 'completed' | 'blocked';
        completion: number;
        steps: {
          [key: string]: {
            completed: boolean;
            data?: any;
          };
        };
      };
    };
  };
  // Keep old structure for backward compatibility
  completionSteps?: {
    basicInfo: boolean;
    experience: boolean;
    skills: boolean;
    languages: boolean;
    assessment: boolean;
  };
  personalInfo: {
    name: string;
    // Updated: country instead of location, can be ObjectId or string
    country?: Timezone | string;
    location?: string; // Keep for backward compatibility
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
  // Updated: availability with timezone as ObjectId or string
  availability?: {
    schedule?: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }>;
    timeZone?: Timezone | string;
    flexibility?: string[];
  };
  lastUpdated: string;
}

export function Profile() {
  console.log('🧩 Profile component initializing');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(window.location.search.includes('edit=true'));
  const [editInitialTab, setEditInitialTab] = useState('profile');

  useEffect(() => {
    const url = new URL(window.location.href);
    if (isEditing) {
      url.searchParams.set('edit', 'true');
    } else {
      url.searchParams.delete('edit');
    }
    window.history.replaceState({}, '', url.toString());
    // Dispatch a custom event to notify App.tsx if needed
    window.dispatchEvent(new Event('profile_edit_toggle'));
  }, [isEditing]);

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

  // Handle profile update
  const handleProfileUpdate = async (updatedProfile: ProfileData) => {
    try {
      // Just update the local state and exit edit mode
      // No need to make another API call since ProfileEditView already handled the updates
      console.log('📝 Updating local profile state with saved changes');
      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile state:', error);
    }
  };

  if (loading) {
    console.log('⏳ Profile is in loading state, showing loading screen');
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Profile Header Skeleton */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center gap-6">
            <Skeleton className="w-24 h-24 rounded-2xl" variant="rounded" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-1/3" variant="rounded" />
              <Skeleton className="h-4 w-1/4" variant="rounded" />
            </div>
            <Skeleton className="w-32 h-10 rounded-xl" variant="rounded" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sidebar Skeleton */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                <Skeleton className="h-6 w-1/2" variant="rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" variant="rounded" />
                  <Skeleton className="h-4 w-full" variant="rounded" />
                  <Skeleton className="h-4 w-3/4" variant="rounded" />
                </div>
              </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
                <Skeleton className="h-8 w-1/3" variant="rounded" />
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" variant="rounded" />
                  <Skeleton className="h-20 w-full" variant="rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
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
        {isEditing ? (
          <ProfileEditView
            profile={profile}
            onSave={handleProfileUpdate}
            initialTab={editInitialTab}
          />
        ) : (
          <ProfileView
            profile={profile}
            onEditClick={(tab?: string) => {
              setEditInitialTab(tab || 'profile');
              setIsEditing(true);
            }}
            onProfileUpdate={handleProfileUpdate}
          />
        )}
      </div>
    </div>
  );
}