import { profileApi } from './client.tsx';
import Cookies from 'js-cookie';

// Cache duration in milliseconds (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

/**
 * Get profile data from localStorage or API if necessary
 */
export const getProfileData = async () => {
  console.log('🔍 Attempting to get profile data...');
  
  // Try to get from localStorage first
  const storedProfile = localStorage.getItem('profileData');
  const storedTimestamp = localStorage.getItem('profileDataTimestamp');
  
  if (!storedProfile) {
    console.log('📭 No profile data found in localStorage');
    console.log('🌐 Fetching fresh data from API...');
    return await fetchProfileFromAPI();
  }
  
  // Check if data exists and is fresh
  const dataIsFresh = storedTimestamp && 
                     (Date.now() - parseInt(storedTimestamp)) < CACHE_DURATION;
  
  if (dataIsFresh) {
    console.log('✅ Using cached profile data from localStorage');
    console.log(`⏱️ Cache age: ${Math.round((Date.now() - parseInt(storedTimestamp)) / 1000 / 60)} minutes`);
    try {
      const parsedData = JSON.parse(storedProfile);
      console.log('🔢 Data properties:', Object.keys(parsedData));
      return parsedData;
    } catch (err) {
      console.error('❌ Error parsing localStorage data:', err);
      console.log('🌐 Falling back to API fetch...');
      return await fetchProfileFromAPI();
    }
  } else {
    console.log('⏱️ Cached data expired');
    console.log(`⏱️ Cache age: ${Math.round((Date.now() - parseInt(storedTimestamp || '0')) / 1000 / 60)} minutes (max: ${CACHE_DURATION / 1000 / 60} minutes)`);
    console.log('🌐 Fetching fresh data from API...');
    return await fetchProfileFromAPI();
  }
};

/**
 * Fetch profile data from API and update localStorage
 */
export const fetchProfileFromAPI = async () => {
  console.log('🌐 fetchProfileFromAPI: Starting API fetch process');
  
  // Get run mode from environment variable
  const runMode = import.meta.env.VITE_RUN_MODE || 'in-app';
  let userId;
  
  // Determine userId based on run mode
  if (runMode === 'standalone') {
    console.log("🔑 Running in standalone mode");
    // Use static userId from environment variable in standalone mode
    userId = import.meta.env.VITE_STANDALONE_USER_ID;
    console.log("🔑 Using static userID from env:", userId);
  } else {
    console.log("🔑 Running in in-app mode");
    // Use userId from cookies in in-app mode
    userId = Cookies.get('userId');
    console.log("🔑 userId cookie:", userId);
    console.log("🔑 Verified saved user ID from cookie:", userId);
  }
  
  if (!userId) {
    console.error('❌ No userId found based on run mode:', runMode);
    throw new Error('User ID not found');
  }
  
  console.log(`👤 Using userId: ${userId}`);
  
  try {
    console.log('🌐 Attempting to fetch profile by user ID...');
    const response = await profileApi.getById(userId);
    console.log('✅ Successfully fetched profile by user ID');
    const profileData = response.data.data;
    
    console.log('💾 Storing profile data in localStorage');
    if (profileData._id) {
      localStorage.setItem('agentId', profileData._id);
      console.log(`📋 Stored agentId: ${profileData._id}`);
    }
    
    // Store the entire profile data in localStorage
    localStorage.setItem('profileData', JSON.stringify(profileData));
    localStorage.setItem('profileDataTimestamp', Date.now().toString());
    console.log('✅ Profile data cached successfully');
    
    return profileData;
  } catch (idError) {
    console.error('❌ Error fetching by ID:', idError);
    console.log('🌐 Falling back to default profile endpoint...');
    
    try {
      const response = await profileApi.get();
      console.log('✅ Successfully fetched profile from default endpoint');
      const profileData = response.data;
      
      console.log('💾 Storing profile data in localStorage');
      if (profileData._id) {
        localStorage.setItem('agentId', profileData._id);
        console.log(`📋 Stored agentId: ${profileData._id}`);
      }
      
      // Store the entire profile data in localStorage
      localStorage.setItem('profileData', JSON.stringify(profileData));
      localStorage.setItem('profileDataTimestamp', Date.now().toString());
      console.log('✅ Profile data cached successfully');
      
      return profileData;
    } catch (fallbackError) {
      console.error('❌ Error fetching from fallback endpoint:', fallbackError);
      throw fallbackError;
    }
  }
};

/**
 * Update profile data in API and localStorage
 */
export const updateProfileData = async (profileId: string, data: any) => {
  console.log('🔄 Updating profile data...', { profileId, dataKeys: Object.keys(data) });
  
  try {
    // Update in API
    console.log('🌐 Sending update to API...');
    const response = await profileApi.update(profileId, data);
    console.log('✅ API update successful');
    
    // Get fresh data from API to ensure consistency
    console.log('🔄 Refreshing cached data with latest from API...');
    await fetchProfileFromAPI();
    console.log('✅ Cache refresh complete');
    
    return response.data;
  } catch (error) {
    console.error('❌ Error updating profile data:', error);
    throw error;
  }
};

/**
 * Check if profile data in localStorage is valid and not expired
 */
export const isProfileDataValid = () => {
  console.log('🔍 Checking if cached profile data is valid...');
  
  const storedProfile = localStorage.getItem('profileData');
  const storedTimestamp = localStorage.getItem('profileDataTimestamp');
  
  if (!storedProfile) {
    console.log('📭 No profile data found in localStorage');
    return false;
  }
  
  if (!storedTimestamp) {
    console.log('⏱️ No timestamp found for cached data');
    return false;
  }
  
  try {
    // Check if data is valid JSON
    JSON.parse(storedProfile);
    console.log('✅ Cached data is valid JSON');
    
    // Check if data is fresh
    const cacheAge = Date.now() - parseInt(storedTimestamp);
    const dataIsFresh = cacheAge < CACHE_DURATION;
    
    if (dataIsFresh) {
      console.log(`✅ Cache is fresh (${Math.round(cacheAge / 1000 / 60)} minutes old)`);
      return true;
    } else {
      console.log(`⏱️ Cache expired (${Math.round(cacheAge / 1000 / 60)} minutes old, max: ${CACHE_DURATION / 1000 / 60} minutes)`);
      return false;
    }
  } catch (e) {
    console.error('❌ Error validating cached data:', e);
    return false;
  }
};

/**
 * Clear profile data from localStorage
 */
export const clearProfileData = () => {
  console.log('🧹 Clearing profile data from localStorage...');
  localStorage.removeItem('profileData');
  localStorage.removeItem('profileDataTimestamp');
  localStorage.removeItem('agentId');
  console.log('✅ Profile data cleared');
}; 