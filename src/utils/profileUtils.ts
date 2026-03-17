import { profileApi } from './client.tsx';
import Cookies from 'js-cookie';

// Cache duration in milliseconds (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

// Add Plan interfaces
interface Plan {
  _id: string;
  name: string;
  price: number;
  targetUserType: string;
  createdAt: string;
  updatedAt: string;
}

interface PlanResponse {
  _id: number;
  userId: number;
  plan: Plan;
}

// Add interface for IP history
interface IpHistoryEntry {
  _id: string;
  ip: string;
  timestamp: string;
  action: string;
  locationInfo: {
    location: {
      _id: string;
      countryCode: string;
      countryName: string;
      zoneName: string;
      gmtOffset: number;
    };
    region: string;
    city: string;
    isp: string;
    postal: string;
    coordinates: string;
  };
}

interface IpHistoryResponse {
  success: boolean;
  data: IpHistoryEntry[];
  message: string;
}

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
    // Use userId or agentId from cookies, session, or local storage
    userId = Cookies.get('userId') || 
             Cookies.get('agentId') || 
             sessionStorage.getItem('userId') || 
             sessionStorage.getItem('agentId') ||
             localStorage.getItem('userId') ||
             localStorage.getItem('agentId');
    console.log("🔑 userId found (Any source):", userId);
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
    console.log('🔍 Response structure:', response.data);

    // Handle different response structures
    const profileData = response.data.data || response.data;
    console.log('📋 Extracted profile data:', profileData);

    if (!profileData) {
      throw new Error('No profile data found in response');
    }

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

/**
 * Update basic info of a profile
 */
export const updateBasicInfo = async (id: string, basicInfo: any) => {
  try {
    console.log('🔄 Updating basic info...', { id, dataKeys: Object.keys(basicInfo) });
    const { data } = await profileApi.updateBasicInfo(id, basicInfo);

    // Refresh cached data
    await fetchProfileFromAPI();

    return data;
  } catch (error: any) {
    console.error('❌ Error updating basic info:', error);
    throw error.response?.data || error;
  }
};

/**
 * Update experience of a profile
 */
export const updateExperience = async (id: string, experience: any) => {
  try {
    console.log('🔄 Updating experience...', { id });
    const { data } = await profileApi.updateExperience(id, experience);

    // Refresh cached data
    await fetchProfileFromAPI();

    return data;
  } catch (error: any) {
    console.error('❌ Error updating experience:', error);
    throw error.response?.data || error;
  }
};

/**
 * Update skills of a profile
 */
export const updateSkills = async (id: string, skills: any) => {
  try {
    console.log('🔄 Updating skills...', { id, skillTypes: Object.keys(skills) });
    const { data } = await profileApi.updateSkills(id, skills);

    // Refresh cached data
    await fetchProfileFromAPI();

    return data;
  } catch (error: any) {
    console.error('❌ Error updating skills:', error);
    throw error.response?.data || error;
  }
};

/**
 * Get profile subscription plan
 */
export const getProfilePlan = async (profileId: string): Promise<PlanResponse> => {
  console.log('🔍 Fetching profile subscription plan...', { profileId });

  try {
    const response = await profileApi.getPlan(profileId);
    console.log('✅ Successfully fetched plan data:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching plan data:', error);
    throw error;
  }
};

// Function to fetch user's IP history
export const fetchUserIpHistory = async (userId: string): Promise<IpHistoryResponse> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${import.meta.env.VITE_AUTH_API_URL}/users/${userId}/ip-history`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching IP history:', error);
    throw error;
  }
};

// Function to get the first login country code
export const getFirstLoginCountryCode = (ipHistory: IpHistoryEntry[]): string | null => {
  // Filter only login actions and sort by timestamp (oldest first)
  const loginEntries = ipHistory
    .filter(entry => entry.action === 'login')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (loginEntries.length === 0) {
    return null;
  }

  // Return the country code of the first login
  return loginEntries[0].locationInfo.location.countryCode;
};

// Helper function to get userId based on run mode
export const getUserId = (): string => {
  const runMode = import.meta.env.VITE_RUN_MODE || 'in-app';
  let userId: string;

  // Determine userId based on run mode
  if (runMode === 'standalone') {
    console.log("🔑 Running in standalone mode");
    // Use static userId from environment variable in standalone mode
    userId = import.meta.env.VITE_STANDALONE_USER_ID;
    console.log("🔑 Using static userID from env:", userId);
  } else {
    console.log("🔑 Running in in-app mode");
    // Use userId or agentId from cookies, session, or local storage
    userId = Cookies.get('userId') || 
             Cookies.get('agentId') || 
             sessionStorage.getItem('userId') || 
             sessionStorage.getItem('agentId') ||
             localStorage.getItem('userId') ||
             localStorage.getItem('agentId') || '';
    console.log("🔑 userId found (Any source):", userId);
  }

  if (!userId) {
    console.error('❌ No userId found based on run mode:', runMode);
    throw new Error('User ID not found');
  }

  console.log(`👤 Using userId: ${userId}`);
  return userId;
};

// Function to check country mismatch - now with automatic userId retrieval
export const checkCountryMismatch = async (
  selectedCountryCode: string,
  countries: any[]
): Promise<{
  hasMismatch: boolean;
  firstLoginCountry?: string;
  selectedCountry?: string;
  firstLoginCountryCode?: string;
} | null> => {
  try {
    // Get userId automatically
    const userId = getUserId();

    const ipHistoryResponse = await fetchUserIpHistory(userId);

    if (!ipHistoryResponse.success) {
      console.error('Failed to fetch IP history:', ipHistoryResponse.message);
      return null;
    }

    const firstLoginCountryCode = getFirstLoginCountryCode(ipHistoryResponse.data);

    if (!firstLoginCountryCode) {
      console.log('No login history found');
      return null;
    }

    // Check if there's a mismatch
    const hasMismatch = firstLoginCountryCode !== selectedCountryCode;

    if (hasMismatch) {
      // Find country names for display
      const firstLoginCountryData = countries.find(c => c.countryCode === firstLoginCountryCode);
      const selectedCountryData = countries.find(c => c.countryCode === selectedCountryCode);

      return {
        hasMismatch: true,
        firstLoginCountry: firstLoginCountryData?.countryName || firstLoginCountryCode,
        selectedCountry: selectedCountryData?.countryName || selectedCountryCode,
        firstLoginCountryCode
      };
    }

    return { hasMismatch: false };
  } catch (error) {
    console.error('Error checking country mismatch:', error);
    return null;
  }
}; 