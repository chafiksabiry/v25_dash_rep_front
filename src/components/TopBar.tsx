import React, { useEffect, useState } from 'react';
import { Bell, Search, User } from 'lucide-react';
import { getUserInfo } from '../utils/authUtils';

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

export function TopBar() {
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
        
        console.log('✅ TopBar component: Profile data loaded successfully');
        console.log('📸 Profile photo URL:', userInfo.photo);
        
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
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-end px-8 sticky top-0 z-10">
      <div className="flex items-center space-x-6">
        <div className="relative group cursor-pointer">
          <div className="p-2 text-slate-400 hover:text-harx-pink transition-colors">
            <Bell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-harx-pink rounded-full border-2 border-white"></span>
          </div>
        </div>
        
        <div className="h-8 w-[1px] bg-gray-100"></div>

        <div className="flex items-center space-x-4 group cursor-pointer">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800 group-hover:text-harx-pink transition-colors">{userName}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{userRole}</p>
          </div>
          
          {profileData?.personalInfo?.photo?.url ? (
            <div className="relative">
              <img
                src={profileData.personalInfo.photo.url}
                alt={userName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-harx-pink/20 transition-all"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-harx-pink/10 flex items-center justify-center text-harx-pink font-bold border border-harx-pink/20 group-hover:bg-harx-pink group-hover:text-white transition-all">
              {initials}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}