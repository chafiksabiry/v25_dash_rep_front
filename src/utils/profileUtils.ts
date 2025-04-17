import { profileApi } from './client.tsx';
import Cookies from 'js-cookie';

// Cache duration in milliseconds (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

/**
 * Get profile data from localStorage or API if necessary
 */
export const getProfileData = async () => {
  // Try to get from localStorage first
  const storedProfile = localStorage.getItem('profileData');
  const storedTimestamp = localStorage.getItem('profileDataTimestamp');
  
  // Check if data exists and is fresh
  const dataIsFresh = storedTimestamp && 
                     (Date.now() - parseInt(storedTimestamp)) < CACHE_DURATION;
  
  if (storedProfile && dataIsFresh) {
    return JSON.parse(storedProfile);
  }
  
  // If no data or stale, fetch from API
  return await fetchProfileFromAPI();
};

/**
 * Fetch profile data from API and update localStorage
 */
export const fetchProfileFromAPI = async () => {
  const userId = Cookies.get('userId');
  
  if (!userId) {
    throw new Error('User ID not found in cookies');
  }
  
  try {
    const response = await profileApi.getById(userId);
    const profileData = response.data.data;
    
    if (profileData._id) {
      localStorage.setItem('agentId', profileData._id);
    }
    
    // Store the entire profile data in localStorage
    localStorage.setItem('profileData', JSON.stringify(profileData));
    localStorage.setItem('profileDataTimestamp', Date.now().toString());
    
    return profileData;
  } catch (idError) {
    // Fallback to default endpoint
    const response = await profileApi.get();
    const profileData = response.data;
    
    if (profileData._id) {
      localStorage.setItem('agentId', profileData._id);
    }
    
    // Store the entire profile data in localStorage
    localStorage.setItem('profileData', JSON.stringify(profileData));
    localStorage.setItem('profileDataTimestamp', Date.now().toString());
    
    return profileData;
  }
};

/**
 * Update profile data in API and localStorage
 */
export const updateProfileData = async (profileId: string, data: any) => {
  // Update in API
  const response = await profileApi.update(profileId, data);
  
  // Get fresh data from API to ensure consistency
  await fetchProfileFromAPI();
  
  return response.data;
};

/**
 * Check if profile data in localStorage is valid and not expired
 */
export const isProfileDataValid = () => {
  const storedProfile = localStorage.getItem('profileData');
  const storedTimestamp = localStorage.getItem('profileDataTimestamp');
  
  if (!storedProfile || !storedTimestamp) {
    return false;
  }
  
  try {
    // Check if data is valid JSON
    JSON.parse(storedProfile);
    
    // Check if data is fresh
    const dataIsFresh = (Date.now() - parseInt(storedTimestamp)) < CACHE_DURATION;
    
    return dataIsFresh;
  } catch (e) {
    return false;
  }
};

/**
 * Clear profile data from localStorage
 */
export const clearProfileData = () => {
  localStorage.removeItem('profileData');
  localStorage.removeItem('profileDataTimestamp');
  localStorage.removeItem('agentId');
}; 