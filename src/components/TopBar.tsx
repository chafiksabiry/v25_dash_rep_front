import React, { useEffect, useState } from 'react';
import { Bell, Search, User, Menu } from 'lucide-react';
import { getUserInfo } from '../utils/authUtils';

interface TopBarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

interface ProfileData {
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    photo?: {
      url: string;
      publicId: string;
    };
  };
  professionalSummary?: {
    currentRole?: string;
    yearsOfExperience?: string;
    profileDescription?: string;
  };
}

// Add event listener for profile updates
const PROFILE_UPDATE_EVENT = 'PROFILE_UPDATED';

export function TopBar({ isSidebarOpen, setIsSidebarOpen }: TopBarProps) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  const loadProfileData = () => {
    console.log('🔄 TopBar component: Loading profile data');
    try {
      const userInfo = getUserInfo();
      if (userInfo) {
        // Convertir les données utilisateur au format attendu par le TopBar
        const adaptedProfileData: ProfileData = {
          personalInfo: {
            name: userInfo.name,
            email: userInfo.email,
            photo: userInfo.photo ? { url: userInfo.photo, publicId: '' } : undefined
          },
          professionalSummary: {
            currentRole: userInfo.currentRole
          }
        };
        
        setProfileData(adaptedProfileData);
      } else {
        console.log('⚠️ TopBar component: No profile data available');
      }
    } catch (error) {
      console.error('❌ TopBar component: Error loading profile data:', error);
    }
  };

  useEffect(() => {
    // Initial load
    loadProfileData();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      console.log('🔄 TopBar: Detected profile update, refreshing data');
      loadProfileData();
    };

    window.addEventListener(PROFILE_UPDATE_EVENT, handleProfileUpdate);

    return () => {
      window.removeEventListener(PROFILE_UPDATE_EVENT, handleProfileUpdate);
    };
  }, []);

  // Get user's name or default to "User"
  const userName = profileData?.personalInfo?.name || 'User';
  
  // Get user's role or default to "HARX Rep"
  const userRole = profileData?.professionalSummary?.currentRole || 'HARX Rep';
  
  // Generate user's initials for avatar placeholder
  const getInitials = (name: string) => {
    if (!name || name === 'User') return 'U';
    
    const names = name.split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };
  
  const initials = getInitials(userName);

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100/50 flex items-center justify-between px-8 shrink-0 z-20">
      <div className="flex w-full items-center justify-between">
        <button
          className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100 hover:text-harx-500 transition-all duration-300 shadow-sm md:hidden"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center space-x-6 ml-auto">
          <div className="flex items-center space-x-3 p-2 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100">
          {profileData?.personalInfo?.photo?.url ? (
            <img
              src={profileData.personalInfo.photo.url}
              alt={userName}
              className="w-10 h-10 rounded-xl object-cover shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-harx-100 to-harx-200 flex items-center justify-center text-harx-600 font-black shadow-sm">
              {initials}
            </div>
          )}
          <div className="text-right">
            <p className="text-sm font-black tracking-tight text-gray-900">{userName}</p>
            <p className="text-xs font-semibold text-harx-500 uppercase tracking-wider">{userRole}</p>
          </div>
        </div>
      </div>
    </div>
    </header>
  );
}