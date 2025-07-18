import React, { useState, useEffect, useRef } from 'react';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { 
  MapPin, Mail, Phone, Linkedin, Github, Target, Clock, Briefcase, 
  Calendar, GraduationCap, Medal, Star, ThumbsUp, ThumbsDown, Trophy,
  Edit, Check, X, Save, RefreshCw, Plus, Trash2, Camera, Upload, Video,
  Play, Pause, Square, RotateCcw
} from 'lucide-react';
import { updateProfileData, updateBasicInfo, updateExperience, updateSkills, checkCountryMismatch } from '../utils/profileUtils';
import { repWizardApi, Timezone } from '../services/api/repWizard';
import { fetchAllSkills, SkillsByCategory, Skill } from '../services/api/skills';
import { fetchAllLanguages, Language } from '../services/api/languages';

// Add CSS styles for error highlighting
const styles = `
  @keyframes highlightError {
    0% { background-color: rgba(239, 68, 68, 0.2); }
    50% { background-color: rgba(239, 68, 68, 0.3); }
    100% { background-color: rgba(239, 68, 68, 0.2); }
  }

  .highlight-error {
    animation: highlightError 1s ease-in-out;
    border-radius: 0.375rem;
    padding: 0.5rem;
  }
`;

// Add styles to document
if (typeof document !== 'undefined' && !document.getElementById('profile-editor-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'profile-editor-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// Convert proficiency level to star rating (A1-C2 = 1-6 stars)
const getProficiencyStars = (proficiency: string): number => {
  switch(proficiency) {
    case 'A1':
    case 'Basic':
      return 1;
    case 'A2':
      return 2;
    case 'B1':
    case 'Intermediate':
      return 3;
    case 'B2':
      return 4;
    case 'C1':
    case 'Advanced':
      return 5;
    case 'C2':
    case 'Native':
      return 6;
    default:
      return 0;
  }
};

// Helper function to format dates safely
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (e) {
    return dateString;
  }
};

// List of contact center skills for the assessments section
const CONTACT_CENTER_SKILLS = [
  {
    name: "Communication",
    skills: ["Active Listening", "Clear Speech", "Empathy", "Tone Management"]
  },
  {
    name: "Problem Solving",
    skills: ["Issue Analysis", "Solution Finding", "Decision Making", "Resource Utilization"]
  },
  {
    name: "Customer Service",
    skills: ["Service Orientation", "Conflict Resolution", "Product Knowledge", "Quality Assurance"]
  }
];

// Language proficiency levels
const proficiencyLevels = [
  { value: 'A1', label: 'A1 - Beginner', description: 'Can understand and use basic phrases, introduce themselves' },
  { value: 'A2', label: 'A2 - Elementary', description: 'Can communicate in simple, routine situations' },
  { value: 'B1', label: 'B1 - Intermediate', description: 'Can deal with most situations while traveling, describe experiences' },
  { value: 'B2', label: 'B2 - Upper Intermediate', description: 'Can interact fluently with native speakers, produce clear text' },
  { value: 'C1', label: 'C1 - Advanced', description: 'Can use language flexibly, produce clear well-structured text' },
  { value: 'C2', label: 'C2 - Mastery', description: 'Can understand virtually everything, express spontaneously' }
];

type ProfileEditViewProps = {
  profile: any;
  onSave: (updatedProfile: any) => void;
};

// Define proper types
interface AvailabilityHours {
  start: string;
  end: string;
}

interface ScheduleDay {
  day: string;
  hours: AvailabilityHours;
}

interface Availability {
  schedule: ScheduleDay[];
  timeZone: string | Timezone;
  flexibility: string[];
}

interface Profile {
  _id: string;
  personalInfo: {
    profileImage?: string;
    photo?: {
      url: string;
      publicId: string;
    };
    name?: string;
    [key: string]: any;
  };
  availability: Availability;  // Make it required but initialize with defaults
  [key: string]: any;
}

interface PhotoUploadResponse {
  photoUrl: string;
  publicId: string;
  [key: string]: any;
}

// Modified uploadPhoto function with token
const uploadPhoto = async (agentId: string, photoFile: Blob): Promise<PhotoUploadResponse> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const formData = new FormData();
  formData.append('photo', photoFile);

  try {
    const response = await fetch(`${import.meta.env.VITE_REP_API_URL}/api/profiles/${agentId}/photo`, {
      method: 'PUT',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const updatedProfile = await response.json();
    return updatedProfile;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

// Function to convert base64 to blob
const base64ToBlob = async (base64String: string): Promise<Blob> => {
  // Remove data URL prefix if present
  const base64WithoutPrefix = base64String.split(',')[1] || base64String;
  
  // Decode base64
  const byteString = atob(base64WithoutPrefix);
  
  // Create an array buffer from the decoded string
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  // Create blob from array buffer
  return new Blob([ab], { type: 'image/jpeg' });
};

// Add this near the top of the file with other imports
const PROFILE_UPDATE_EVENT = 'PROFILE_UPDATED';

export const ProfileEditView: React.FC<ProfileEditViewProps> = ({ profile: initialProfile, onSave }) => {
  // Add console.log statements
  console.log('Initial Profile Data:', initialProfile);
  console.log('Initial Availability Data:', initialProfile.availability);

  // Initialize profile state with proper default values for availability
  const [profile, setProfile] = useState<Profile>(() => {
    // Create default availability object
    const defaultAvailability: Availability = {
      schedule: [],
      timeZone: '',
      flexibility: []
    };

    // Merge with initial profile data if it exists
    const mergedAvailability: Availability = {
      ...defaultAvailability,
      ...(initialProfile.availability || {}),
      // Ensure required fields exist with proper types
      schedule: initialProfile.availability?.schedule || [],
      flexibility: initialProfile.availability?.flexibility || [],
      timeZone: initialProfile.availability?.timeZone || ''
    };

    // Ensure timeZone is never null
    if (mergedAvailability.timeZone === null || mergedAvailability.timeZone === undefined) {
      mergedAvailability.timeZone = '';
    }

    return {
      ...initialProfile,
      availability: mergedAvailability
    };
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [tempProfileDescription, setTempProfileDescription] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track which sections have been modified
  const [modifiedSections, setModifiedSections] = useState({
    personalInfo: false,
    professionalSummary: false,
    skills: false,
    experience: false,
    languages: false,
    availability: false,
    profileImage: false
  });
  
  // Additional state for editing
  const [tempLanguage, setTempLanguage] = useState({ language: '', proficiency: 'B1' });
  
  // States for languages data
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  
  // States for language dropdown
  const [languageSearchTerm, setLanguageSearchTerm] = useState('');
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [filteredLanguages, setFilteredLanguages] = useState<Language[]>([]);
  const [selectedLanguageIndex, setSelectedLanguageIndex] = useState(-1);
  const [tempIndustry, setTempIndustry] = useState('');
  const [tempCompany, setTempCompany] = useState('');
  const [tempFlexibility, setTempFlexibility] = useState('');
  const [tempExpertise, setTempExpertise] = useState('');
  const [editingExperience, setEditingExperience] = useState<any>(null);
  const [showNewExperienceForm, setShowNewExperienceForm] = useState(false);


  // Initialize form data state
  const [newExperience, setNewExperience] = useState({
    title: '',
    company: '',
    startDate: '',
    endDate: '',
    responsibilities: [''],
    isPresent: false
  });

  // Add state for editing experience
  const [editingExperienceId, setEditingExperienceId] = useState<number | null>(null);

  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    x: 5,
    y: 5,
    height: 90
  });
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageToShow, setImageToShow] = useState<string | null>(null);

  // Add new state for tracking photo deletion
  const [isPhotoMarkedForDeletion, setIsPhotoMarkedForDeletion] = useState(false);

  // States for timezone and country data
  const [countries, setCountries] = useState<Timezone[]>([]);
  const [timezones, setTimezones] = useState<Timezone[]>([]);
  const [allTimezones, setAllTimezones] = useState<Timezone[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [loadingTimezones, setLoadingTimezones] = useState(false);
  
  // States for searchable country dropdown
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState<Timezone[]>([]);
  const [selectedCountryIndex, setSelectedCountryIndex] = useState(-1);
  
  // States for searchable timezone dropdown
  const [timezoneSearchTerm, setTimezoneSearchTerm] = useState('');
  const [isTimezoneDropdownOpen, setIsTimezoneDropdownOpen] = useState(false);
  const [filteredTimezones, setFilteredTimezones] = useState<Timezone[]>([]);
  const [selectedTimezoneIndex, setSelectedTimezoneIndex] = useState(-1);

  // States for skills data
  const [skillsData, setSkillsData] = useState<{
    technical: SkillsByCategory;
    professional: SkillsByCategory;
    soft: SkillsByCategory;
  }>({
    technical: {},
    professional: {},
    soft: {}
  });
  const [loadingSkills, setLoadingSkills] = useState(false);
  
  // States for skill selection dropdown
  const [skillDropdownOpen, setSkillDropdownOpen] = useState<{[key: string]: boolean}>({});
  const [skillSearchTerm, setSkillSearchTerm] = useState<{[key: string]: string}>({});

  // Add state for country mismatch checking
  const [countryMismatch, setCountryMismatch] = useState<{
    hasMismatch: boolean;
    firstLoginCountry?: string;
    selectedCountry?: string;
    firstLoginCountryCode?: string;
  } | null>(null);
  const [checkingCountryMismatch, setCheckingCountryMismatch] = useState(false);
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);

  // Video recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      setTempProfileDescription(initialProfile.professionalSummary?.profileDescription || '');
      
      // Set initial country search term if country is already selected
      if (initialProfile.personalInfo?.country) {
        if (typeof initialProfile.personalInfo.country === 'object') {
          setCountrySearchTerm(initialProfile.personalInfo.country.countryName || '');
          setSelectedCountry(initialProfile.personalInfo.country.countryCode || '');
        }
      }
      
      // Set initial timezone search term if timezone is already selected
      if (initialProfile.availability?.timeZone) {
        if (typeof initialProfile.availability.timeZone === 'object' && initialProfile.availability.timeZone !== null) {
          setTimezoneSearchTerm(repWizardApi.formatTimezone(initialProfile.availability.timeZone) || '');
        }
      }
    }
  }, [initialProfile]);

  // Load countries and all timezones on component mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        console.log('🌍 Loading countries...');
        const countriesData = await repWizardApi.getCountries();
        setCountries(countriesData);
        console.log('✅ Countries loaded:', countriesData.length);
      } catch (error) {
        console.error('❌ Error loading countries:', error);
        showToast('Failed to load countries', 'error');
      }
    };

    const loadAllTimezones = async () => {
      try {
        console.log('🌐 Loading all timezones...');
        const allTimezonesData = await repWizardApi.getTimezones();
        setAllTimezones(allTimezonesData);
        console.log('✅ All timezones loaded:', allTimezonesData.length);
      } catch (error) {
        console.error('❌ Error loading all timezones:', error);
        showToast('Failed to load timezones', 'error');
      }
    };

    loadCountries();
    loadAllTimezones();
  }, []);

  // Load skills data on component mount
  useEffect(() => {
    const loadSkills = async () => {
      try {
        setLoadingSkills(true);
        console.log('🔧 Loading skills...');
        const skills = await fetchAllSkills();
        setSkillsData(skills);
        console.log('✅ Skills loaded:', skills);
      } catch (error) {
        console.error('❌ Error loading skills:', error);
        showToast('Failed to load skills', 'error');
      } finally {
        setLoadingSkills(false);
      }
    };

    loadSkills();
  }, []);

  // Load languages data on component mount
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        setLoadingLanguages(true);
        console.log('🌐 Loading languages...');
        const languages = await fetchAllLanguages();
        setAvailableLanguages(languages);
        console.log('✅ Languages loaded:', languages.length);
      } catch (error) {
        console.error('❌ Error loading languages:', error);
        showToast('Failed to load languages', 'error');
      } finally {
        setLoadingLanguages(false);
      }
    };

    loadLanguages();
  }, []);

  // Filter languages based on search term
  useEffect(() => {
    if (!languageSearchTerm) {
      setFilteredLanguages(availableLanguages);
    } else {
      const filtered = availableLanguages.filter(language =>
        language.name.toLowerCase().includes(languageSearchTerm.toLowerCase()) ||
        language.code.toLowerCase().includes(languageSearchTerm.toLowerCase()) ||
        language.nativeName.toLowerCase().includes(languageSearchTerm.toLowerCase())
      );
      setFilteredLanguages(filtered);
    }
  }, [availableLanguages, languageSearchTerm]);

  // Load timezones when country is selected and auto-suggest main timezone
  useEffect(() => {
    const loadTimezones = async () => {
      if (!selectedCountry) {
        setTimezones([]);
        return;
      }

      try {
        setLoadingTimezones(true);
        console.log(`🌐 Loading timezones for country: ${selectedCountry}`);
        const timezonesData = await repWizardApi.getTimezonesByCountry(selectedCountry);
        setTimezones(timezonesData);
        console.log('✅ Timezones loaded:', timezonesData.length);
        
        // Auto-suggest main timezone only if no timezone is currently set
        const currentTimezone = profile.availability.timeZone;
        if ((!currentTimezone || currentTimezone === '' || currentTimezone === null) && timezonesData.length > 0) {
          // Find the main timezone (usually the first one or one with highest priority)
          const mainTimezone = timezonesData[0]; // Take the first timezone as main
          console.log('🎯 Auto-suggesting main timezone:', mainTimezone.zoneName);
          
          setProfile((prev: Profile) => ({
            ...prev,
            availability: {
              ...prev.availability,
              timeZone: mainTimezone._id
            }
          }));
          setModifiedSections(prev => ({
            ...prev,
            availability: true
          }));
        }
      } catch (error) {
        console.error('❌ Error loading timezones:', error);
        showToast('Failed to load timezones', 'error');
      } finally {
        setLoadingTimezones(false);
      }
    };

    loadTimezones();
  }, [selectedCountry]); // Only depend on selectedCountry to avoid infinite loops

  // Filter countries based on search term
  useEffect(() => {
    if (!countrySearchTerm) {
      setFilteredCountries(countries);
    } else {
      const filtered = countries.filter(country =>
        country.countryName.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
        country.countryCode.toLowerCase().includes(countrySearchTerm.toLowerCase())
      );
      setFilteredCountries(filtered);
    }
  }, [countries, countrySearchTerm]);

  // Filter timezones based on search term
  useEffect(() => {
    // Combine suggested timezones and all other timezones
    const allAvailableTimezones = [...timezones, ...allTimezones.filter(tz => !timezones.some(suggestedTz => suggestedTz._id === tz._id))];
    
    if (!timezoneSearchTerm) {
      setFilteredTimezones(allAvailableTimezones);
    } else {
      const filtered = allAvailableTimezones.filter(timezone =>
        timezone.countryName.toLowerCase().includes(timezoneSearchTerm.toLowerCase()) ||
        timezone.zoneName.toLowerCase().includes(timezoneSearchTerm.toLowerCase()) ||
        timezone.countryCode.toLowerCase().includes(timezoneSearchTerm.toLowerCase())
      );
      setFilteredTimezones(filtered);
    }
  }, [timezones, allTimezones, timezoneSearchTerm]);

  // Show toast message
  const showToast = (message: string, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Helper function to get language data by ID
  const getLanguageById = (languageId: string): Language | null => {
    return availableLanguages.find(lang => lang._id === languageId) || null;
  };

  // Helper function to get language display name
  const getLanguageDisplayName = (lang: any): string => {
    if (typeof lang.language === 'object' && lang.language) {
      return lang.language.name || 'Unknown Language';
    } else if (typeof lang.language === 'string') {
      const languageData = getLanguageById(lang.language);
      return languageData ? languageData.name : 'Unknown Language';
    }
    return 'Unknown Language';
  };

  // Helper function to get language code
  const getLanguageCode = (lang: any): string => {
    if (typeof lang.language === 'object' && lang.language) {
      return lang.language.code || '';
    } else if (typeof lang.language === 'string') {
      const languageData = getLanguageById(lang.language);
      return languageData ? languageData.code : '';
    }
    return '';
  };

  // Get timezone and country mismatch info
  const getTimezoneMismatchInfo = () => {
    // Check if timeZone exists and is not null
    if (!profile.availability.timeZone) {
      return null;
    }
    
    const currentTimezoneId = typeof profile.availability.timeZone === 'object' 
      ? profile.availability.timeZone._id 
      : profile.availability.timeZone;
    
    const selectedCountryData = countries.find(c => c.countryCode === selectedCountry);
    const selectedTimezoneData = allTimezones.find(tz => tz._id === currentTimezoneId);
    
    if (!selectedCountryData || !selectedTimezoneData || !currentTimezoneId) {
      return null;
    }
    
    // Check if timezone belongs to selected country
    const timezoneCountry = selectedTimezoneData.countryCode;
    const selectedCountryCode = selectedCountryData.countryCode;
    
    if (timezoneCountry !== selectedCountryCode) {
      const timezoneCountryData = countries.find(c => c.countryCode === timezoneCountry);
      return {
        timezoneCountry: timezoneCountryData?.countryName || timezoneCountry,
        selectedCountry: selectedCountryData.countryName,
        timezoneName: selectedTimezoneData.zoneName
      };
    }
    
    return null;
  };

  // Validate profile data
  const validateProfile = () => {
    const errors: Record<string, string> = {};

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Phone validation regex - accepts various formats with optional country code
    const phoneRegex = /^\+?[\d\s-]{10,}$/;

    // Validate languages (at least one required)
    if (!profile.personalInfo?.languages?.length) {
      errors.languages = 'At least one language is required';
    }

    // Validate name
    if (!profile.personalInfo?.name?.trim()) {
      errors.name = 'Name is required';
    }

    // Validate country
    if (!profile.personalInfo?.country) {
      errors.country = 'Country is required';
    }

    // Validate email
    if (!profile.personalInfo?.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(profile.personalInfo.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Validate phone
    if (!profile.personalInfo?.phone?.trim()) {
      errors.phone = 'Phone number is required';
    } else if (profile.personalInfo.phone.trim() && !phoneRegex.test(profile.personalInfo.phone.replace(/\s+/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Render error messages
  const renderError = (error: string | undefined, id: string) => {
    if (!error) return null;
    return (
      <div id={`error-${id}`} className="text-red-600 text-sm mt-1 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </div>
    );
  };

  // Add function to fetch updated profile data
  const refreshProfileData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${import.meta.env.VITE_REP_API_URL}/api/profiles/${profile._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('Error refreshing profile data:', error);
      throw error;
    }
  };

  // Modified handleSave to include photo deletion
  const handleSave = async () => {
    console.log('🔄 Starting save process...');
    console.log('Modified sections:', modifiedSections);
    console.log('Current profile state:', profile);

    const { isValid, errors } = validateProfile();
    setValidationErrors(errors);
    
    if (!isValid) {
      console.log('❌ Validation failed:', errors);
      showToast('Please fix validation errors before saving', 'error');
      return;
    }

    setLoading(true);
    try {
      // Handle photo deletion first if marked for deletion
      if (isPhotoMarkedForDeletion) {
        console.log('📝 Processing photo deletion...');
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        console.log('🔗 Deleting photo for profile:', profile._id);
        const deleteResponse = await fetch(`${import.meta.env.VITE_REP_API_URL}/api/profiles/${profile._id}/photo`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!deleteResponse.ok) {
          console.error('❌ Failed to delete photo. Status:', deleteResponse.status);
          throw new Error(`Failed to delete photo: ${deleteResponse.status}`);
        }
        console.log('✅ Photo deleted successfully from server');
      }

      // Handle photo upload if modified
      if (modifiedSections.profileImage && imagePreview && !isPhotoMarkedForDeletion) {
        try {
          setUploadingPhoto(true);
          console.log('📸 Uploading new profile photo...');
          
          const photoBlob = await base64ToBlob(imagePreview);
          const photoResult = await uploadPhoto(profile._id, photoBlob);
          
          console.log('✅ Photo uploaded successfully');
        } catch (error) {
          console.error('❌ Error uploading photo:', error);
          if (error instanceof Error && error.message === 'No authentication token found') {
            showToast('Please log in again to upload photo', 'error');
          } else {
            showToast('Failed to upload profile photo', 'error');
          }
          return;
        } finally {
          setUploadingPhoto(false);
        }
      }

      // Continue with other profile updates
      // Save personal info if modified
      if (modifiedSections.personalInfo) {
        console.log('📝 Saving personal info...', {
          endpoint: `/api/profiles/${profile._id}/basic-info`,
          data: profile.personalInfo
        });
        await updateBasicInfo(profile._id, profile.personalInfo);
      }

      // Save professional summary if modified
      if (modifiedSections.professionalSummary) {
        console.log('📝 Saving professional summary...', {
          endpoint: `/api/profiles/${profile._id}`,
          data: { professionalSummary: profile.professionalSummary }
        });
        await updateProfileData(profile._id, { professionalSummary: profile.professionalSummary });
      }

      // Save skills if modified
      if (modifiedSections.skills) {
        console.log('📝 Saving skills...');
        
        // Helper function to get full skill object by ID
        const getFullSkillObject = (skillId: string, skillType: 'technical' | 'professional' | 'soft') => {
          const skillsForType = skillsData[skillType];
          for (const category of Object.values(skillsForType)) {
            const foundSkill = category.find((s: Skill) => s._id === skillId);
            if (foundSkill) {
              return foundSkill;
            }
          }
          return null;
        };

        // Format skills as objects with proper structure
        const formattedSkills = {
          technical: (profile.skills?.technical || []).map((skillRef: any) => {
            const skillId = typeof skillRef === 'string' ? skillRef : skillRef.skill;
            const fullSkillObject = getFullSkillObject(skillId, 'technical');
            if (fullSkillObject) {
              return {
                _id: fullSkillObject._id,
                name: fullSkillObject.name,
                description: fullSkillObject.description
              };
            }
            return { _id: skillId, name: 'Unknown', description: '' };
          }),
          professional: (profile.skills?.professional || []).map((skillRef: any) => {
            const skillId = typeof skillRef === 'string' ? skillRef : skillRef.skill;
            const fullSkillObject = getFullSkillObject(skillId, 'professional');
            if (fullSkillObject) {
              return {
                _id: fullSkillObject._id,
                name: fullSkillObject.name,
                description: fullSkillObject.description
              };
            }
            return { _id: skillId, name: 'Unknown', description: '' };
          }),
          soft: (profile.skills?.soft || []).map((skillRef: any) => {
            const skillId = typeof skillRef === 'string' ? skillRef : skillRef.skill;
            const fullSkillObject = getFullSkillObject(skillId, 'soft');
            if (fullSkillObject) {
              return {
                _id: fullSkillObject._id,
                name: fullSkillObject.name,
                description: fullSkillObject.description
              };
            }
            return { _id: skillId, name: 'Unknown', description: '' };
          }),
          // Preserve existing contactCenter skills with their assessment results
          contactCenter: (profile.skills?.contactCenter || []).map((skill: any) => ({
            skill: skill.skill || '',
            category: skill.category || 'Customer Service',
            proficiency: skill.proficiency || 'Basic',
            assessmentResults: skill.assessmentResults || {
              score: 0,
              strengths: [],
              improvements: [],
              feedback: '',
              tips: [],
              keyMetrics: {
                professionalism: 0,
                effectiveness: 0,
                customerFocus: 0
              },
              completedAt: new Date().toISOString()
            }
          }))
        };
        
        console.log('Skills data to be sent:', {
          endpoint: `/api/profiles/${profile._id}/skills`,
          data: formattedSkills
        });
        await updateSkills(profile._id, formattedSkills);
      }

      // Save experience if modified
      if (modifiedSections.experience) {
        console.log('📝 Saving experience...', {
          endpoint: `/api/profiles/${profile._id}/experience`,
          data: { experience: profile.experience }
        });
        await updateExperience(profile._id, profile.experience);
      }

      // Save languages if modified
      if (modifiedSections.languages) {
        console.log('📝 Saving languages...', {
          endpoint: `/api/profiles/${profile._id}/basic-info`,
          data: {
            ...profile.personalInfo,
            languages: profile.personalInfo?.languages || []
          }
        });
        await updateBasicInfo(profile._id, {
          ...profile.personalInfo,
          languages: profile.personalInfo?.languages || []
        });
      }

      // Save availability if modified
      if (modifiedSections.availability) {
        console.log('📝 Saving availability...', {
          endpoint: `/api/profiles/${profile._id}`,
          data: { availability: profile.availability }
        });
        await updateProfileData(profile._id, { availability: profile.availability });
      }

      // After all updates are done, refresh the profile data
      const updatedProfile = await refreshProfileData();
      
      // Reset modified sections
      setModifiedSections({
        personalInfo: false,
        professionalSummary: false,
        skills: false,
        experience: false,
        languages: false,
        availability: false,
        profileImage: false
      });

      // Reset photo deletion state after successful save
      setIsPhotoMarkedForDeletion(false);

      console.log('✅ All changes saved successfully');
      showToast('Profile saved successfully', 'success');
      
      // Update localStorage and dispatch event for TopBar update
      localStorage.setItem('profileData', JSON.stringify(updatedProfile));
      window.dispatchEvent(new Event(PROFILE_UPDATE_EVENT));
      
      onSave(updatedProfile);
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        profileId: profile._id
      });
      showToast('Failed to save profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle profile changes for personal info
  const handleProfileChange = (field: string, value: any) => {
    // Update local state
    const updatedPersonalInfo = {
      ...profile.personalInfo,
      [field]: value
    };
    
    setProfile((prev: Profile) => ({
      ...prev,
      personalInfo: updatedPersonalInfo
    }));
    
    // Mark personal info section as modified
    setModifiedSections(prev => ({
      ...prev,
      personalInfo: true
    }));
    
    // Clear validation error for this field if value is valid
    if (value && value.trim()) {
      setValidationErrors((prev: Record<string, string>) => ({
        ...prev,
        [field]: ''
      }));
    }
  };
  
  // Add language to profile
  const addLanguage = (selectedLanguage: Language) => {
    // Check if language is already added
    const isAlreadyAdded = profile.personalInfo?.languages?.some((lang: any) => {
      const langId = typeof lang.language === 'object' ? lang.language._id : lang.language;
      return langId === selectedLanguage._id;
    });

    if (isAlreadyAdded) {
      showToast('This language is already added', 'error');
      return;
    }

    const newLanguageEntry = {
      language: selectedLanguage._id,
      proficiency: tempLanguage.proficiency
    };
    
    const updatedLanguages = [
      ...(profile.personalInfo?.languages || []),
      newLanguageEntry
    ];
    
    // Update local state
    setProfile((prev: Profile) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        languages: updatedLanguages
      }
    }));
    
    // Mark languages section as modified
    setModifiedSections(prev => ({
      ...prev,
      languages: true
    }));
    
    // Clear any language-related validation errors
    setValidationErrors((prev: Record<string, string>) => ({
      ...prev,
      languages: ''
    }));
    
    // Reset form
    setTempLanguage({ language: '', proficiency: 'B1' });
    setLanguageSearchTerm('');
    setIsLanguageDropdownOpen(false);
    
    showToast('Language added successfully', 'success');
  };
  
  // Remove language from profile
  const removeLanguage = (index: number) => {
    const updatedLanguages = profile.personalInfo.languages.filter((_: any, i: number) => i !== index);
    
    // Update local state
    setProfile((prev: Profile) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        languages: updatedLanguages
      }
    }));
    
    // Mark languages section as modified
    setModifiedSections(prev => ({
      ...prev,
      languages: true
    }));
    
    // Set validation error if removing last language
    if (updatedLanguages.length === 0) {
      setValidationErrors((prev: Record<string, string>) => ({
        ...prev,
        languages: 'At least one language is required'
      }));
    }
  };
  
  // Update language proficiency
  const updateLanguageProficiency = (index: number, newProficiency: string) => {
    const updatedLanguages = profile.personalInfo.languages.map((lang: any, i: number) => 
      i === index ? { ...lang, proficiency: newProficiency } : lang
    );
    
    // Update local state
    setProfile((prev: Profile) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        languages: updatedLanguages
      }
    }));
    
    // Mark languages section as modified
    setModifiedSections(prev => ({
      ...prev,
      languages: true
    }));
  };



  // New skill handlers for skill selector
  const handleSkillsChange = (type: 'technical' | 'professional' | 'soft', skills: Array<{skill: string}>) => {
      setProfile((prev: Profile) => ({
        ...prev,
        skills: {
          ...prev.skills,
        [type]: skills
        }
      }));
      
      setModifiedSections(prev => ({
        ...prev,
        skills: true
      }));
  };

  // Get current skills for each type in the expected format
  const getCurrentSkills = (type: 'technical' | 'professional' | 'soft') => {
    const skills = profile.skills?.[type] || [];
    return skills.map((skill: any) => ({
      skill: skill.skill?._id || skill.skill || skill._id || skill
    }));
  };

  // Function to start editing an experience
  const startEditingExperience = (index: number) => {
    const experience = profile.experience[index];
    setNewExperience({
      title: experience.title || '',
      company: experience.company || '',
      startDate: experience.startDate ? new Date(experience.startDate).toISOString().split('T')[0] : '',
      endDate: experience.endDate === 'present' ? '' : experience.endDate ? new Date(experience.endDate).toISOString().split('T')[0] : '',
      responsibilities: experience.responsibilities || [''],
      isPresent: experience.endDate === 'present'
    });
    setEditingExperienceId(index);
    setShowNewExperienceForm(true);
  };

  // Function to save edited experience
  const saveEditedExperience = () => {
    if (editingExperienceId !== null) {
      const updatedExperiences = [...profile.experience];
      updatedExperiences[editingExperienceId] = {
        title: newExperience.title,
        company: newExperience.company,
        startDate: newExperience.startDate,
        endDate: newExperience.isPresent ? 'present' : newExperience.endDate,
        responsibilities: newExperience.responsibilities.filter(r => r.trim())
      };

      setProfile((prev: Profile) => ({
        ...prev,
        experience: updatedExperiences
      }));

      // Mark experience section as modified
      setModifiedSections(prev => ({
        ...prev,
        experience: true
      }));

      // Reset form and editing state
      setShowNewExperienceForm(false);
      setEditingExperienceId(null);
      setNewExperience({
        title: '',
        company: '',
        startDate: '',
        endDate: '',
        responsibilities: [''],
        isPresent: false
      });
    }
  };

  // Function to calculate scaled dimensions
  const calculateScaledDimensions = (originalWidth: number, originalHeight: number) => {
    const maxWidth = Math.min(window.innerWidth * 0.8, 800); // 80% of viewport width or 800px max
    const maxHeight = Math.min(window.innerHeight * 0.6, 600); // 60% of viewport height or 600px max
    
    let newWidth = originalWidth;
    let newHeight = originalHeight;
    
    // Scale down if width exceeds maxWidth
    if (newWidth > maxWidth) {
      newHeight = (maxWidth * newHeight) / newWidth;
      newWidth = maxWidth;
    }
    
    // Scale down further if height still exceeds maxHeight
    if (newHeight > maxHeight) {
      newWidth = (maxHeight * newWidth) / newHeight;
      newHeight = maxHeight;
    }
    
    return {
      width: Math.floor(newWidth),
      height: Math.floor(newHeight)
    };
  };

  // Modified handleImageChange
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showToast('Image size should be less than 10MB', 'error');
        return;
      }

      // If photo was marked for deletion, unmark it since we're adding a new one
      if (isPhotoMarkedForDeletion) {
        setIsPhotoMarkedForDeletion(false);
        console.log('🔄 Unmarking photo deletion as new photo is being added');
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const scaledDimensions = calculateScaledDimensions(img.width, img.height);
          setImageDimensions(scaledDimensions);
          setTempImage(reader.result as string);
          setShowCropModal(true);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Modified handleCropComplete
  const handleCropComplete = () => {
    if (imageRef.current && crop.width && crop.height) {
      const croppedImageUrl = getCroppedImg(imageRef.current, crop);
      setImagePreview(croppedImageUrl);
      setShowCropModal(false);
      setTempImage(null);
      
      // Ensure we mark the profile image as modified
      setModifiedSections(prev => ({
        ...prev,
        profileImage: true
      }));
      
      console.log('✨ New photo cropped and ready for upload');
    }
  };

  // Function to get cropped image
  const getCroppedImg = (image: HTMLImageElement, crop: Crop): string => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width!;
    canvas.height = crop.height!;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(
        image,
        crop.x! * scaleX,
        crop.y! * scaleY,
        crop.width! * scaleX,
        crop.height! * scaleY,
        0,
        0,
        crop.width!,
        crop.height!
      );
    }

    return canvas.toDataURL('image/jpeg');
  };

  // Modified handleRemoveImage to only mark for deletion
  const handleRemoveImage = () => {
    console.log('🔄 Marking photo for deletion...');
    setIsPhotoMarkedForDeletion(true);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    console.log('🧹 Cleared local image preview and file input');
    
    // Mark profile image as modified
    setModifiedSections(prev => ({
      ...prev,
      profileImage: true
    }));
    console.log('📝 Marked profile image as modified');
    
    showToast('Photo will be removed when you save changes', 'success');
    console.log('✨ Photo marked for deletion');
  };

  // Add helper function for updating schedule
  const updateSchedule = (newSchedule: ScheduleDay[]) => {
    setProfile((prev: Profile) => ({
      ...prev,
      availability: {
        ...prev.availability,
        schedule: newSchedule
      }
    }));
    setModifiedSections(prev => ({
      ...prev,
      availability: true
    }));
  };

  // Add helper function for updating flexibility
  const updateFlexibility = (newFlexibility: string[]) => {
    setProfile((prev: Profile) => ({
      ...prev,
      availability: {
        ...prev.availability,
        flexibility: newFlexibility
      }
    }));
    setModifiedSections(prev => ({
      ...prev,
      availability: true
    }));
  };

  // Video recording functions
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true 
      });
      
      setStream(mediaStream);
      setCameraPermission('granted');
      setShowVideoRecorder(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraPermission('denied');
      showToast('Camera access denied. Please enable camera permissions.', 'error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowVideoRecorder(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startRecording = () => {
    if (!stream) return;

    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      setRecordedVideo(videoUrl);
      
      // Mark video as modified
      setModifiedSections(prev => ({
        ...prev,
        professionalSummary: true
      }));
      
      // Show success message
      showToast('Video recorded successfully!', 'success');
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
    setRecordingTime(0);

    // Start timer (max 60 seconds)
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 59) { // Stop at 59 seconds to prevent going over 1 minute
          // Stop recording and close camera automatically when time limit reached
          stopRecordingAndHideCamera();
          return 60;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecordingAndHideCamera = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
    
    // Hide camera interface immediately to avoid visual flash
    setShowVideoRecorder(false);
    
    // Stop camera stream after a small delay to ensure recording is processed
    setTimeout(() => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      stopRecordingAndHideCamera();
    }
  };

  const deleteVideo = () => {
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
    }
    setRecordedVideo(null);
    setRecordingTime(0);
    
    // Mark as modified to update backend
    setModifiedSections(prev => ({
      ...prev,
      professionalSummary: true
    }));
    
    showToast('Video deleted successfully', 'success');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Effect to handle video stream updates
  useEffect(() => {
    if (stream && videoRef.current && showVideoRecorder) {
      const videoElement = videoRef.current;
      videoElement.srcObject = stream;
      
      const handleLoadedMetadata = () => {
        videoElement.play().catch((error) => {
          console.error('Error playing video:', error);
        });
      };

      const handleError = (error: any) => {
        console.error('Video element error:', error);
      };
      
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('error', handleError);
      
      // Force load if metadata is already available
      if (videoElement.readyState >= 1) {
        handleLoadedMetadata();
      }
      
      return () => {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('error', handleError);
      };
    }
  }, [stream, showVideoRecorder]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (recordedVideo) {
        URL.revokeObjectURL(recordedVideo);
      }
    };
  }, []);

  // Render skill dropdown for adding new skills
  const renderSkillDropdown = (skillType: 'technical' | 'professional' | 'soft', placeholder: string, colorScheme: string) => {
    const skillsForType = skillsData[skillType];
    const searchTerm = skillSearchTerm[skillType] || '';
    const isOpen = skillDropdownOpen[skillType] || false;

    // Filter skills based on search term and exclude already selected skills
    const currentSkills = getCurrentSkills(skillType);
    const selectedSkillIds = new Set(currentSkills.map((s: any) => s.skill));
    
    const filteredSkills: { [category: string]: Skill[] } = {};
    Object.entries(skillsForType).forEach(([category, skills]) => {
      const filtered = skills.filter(skill => 
        !selectedSkillIds.has(skill._id) &&
        (skill.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         skill.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      if (filtered.length > 0) {
        filteredSkills[category] = filtered;
      }
    });

    const addSkill = (skill: Skill) => {
      const newSkill = {
        skill: skill._id
      };
      
      const updatedSkills = [...currentSkills, newSkill];
      handleSkillsChange(skillType, updatedSkills);
      
      // Reset form
      setSkillSearchTerm(prev => ({ ...prev, [skillType]: '' }));
      setSkillDropdownOpen(prev => ({ ...prev, [skillType]: false }));
    };

    return (
      <div className="relative">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSkillSearchTerm(prev => ({ ...prev, [skillType]: e.target.value }));
                setSkillDropdownOpen(prev => ({ ...prev, [skillType]: true }));
              }}
              onFocus={() => setSkillDropdownOpen(prev => ({ ...prev, [skillType]: true }))}
              onBlur={() => {
                setTimeout(() => setSkillDropdownOpen(prev => ({ ...prev, [skillType]: false })), 200);
              }}
              placeholder={placeholder}
              className="w-full p-2 border rounded-md"
            />
            
            {/* Search Icon */}
            <div className="absolute right-2 top-2.5 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Dropdown List */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {Object.keys(filteredSkills).length > 0 ? (
              Object.entries(filteredSkills).map(([category, skills]) => (
                <div key={category}>
                  <div className={`px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 border-b`}>
                    {category}
                  </div>
                  {skills.map((skill) => (
                    <button
                      key={skill._id}
                      type="button"
                      onClick={() => addSkill(skill)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-800">{skill.name}</div>
                      <div className="text-sm text-gray-600 truncate">{skill.description}</div>
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 text-center">
                {searchTerm ? `No skills found matching "${searchTerm}"` : 'No skills available'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Add useEffect to check country mismatch
  useEffect(() => {
    const checkMismatch = async () => {
      if (!selectedCountry || countries.length === 0) {
        return;
      }

      try {
        setCheckingCountryMismatch(true);
        
        // Only show spinner if check takes longer than 800ms
        const spinnerTimer = setTimeout(() => {
          setShowLoadingSpinner(true);
        }, 800);
        
        console.log('🔍 Checking country mismatch for selected country:', selectedCountry);
        
        const mismatchResult = await checkCountryMismatch(
          selectedCountry, 
          countries
        );
        
        // Clear the spinner timer since we got a result
        clearTimeout(spinnerTimer);
        
        if (mismatchResult) {
          setCountryMismatch(mismatchResult);
          if (mismatchResult.hasMismatch) {
            console.log('⚠️ Country mismatch detected:', mismatchResult);
          } else {
            console.log('✅ No country mismatch found');
          }
        }
      } catch (error) {
        console.error('❌ Error checking country mismatch:', error);
      } finally {
        setCheckingCountryMismatch(false);
        setShowLoadingSpinner(false);
      }
    };

    checkMismatch();
  }, [selectedCountry, countries]);

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 p-6">
      {/* Page Header with Save/Cancel Buttons */}
      <div className="md:col-span-12 flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        <div className="flex gap-2">
          <button
            onClick={() => onSave(initialProfile)}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || uploadingPhoto}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || uploadingPhoto ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {uploadingPhoto ? 'Uploading Photo...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save All Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Left Column */}
      <div className="md:col-span-4 space-y-6">
        {/* Profile Header with editable fields */}
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">
            <div className="mb-6 relative">
              <div 
                className="w-32 h-32 rounded-full mx-auto shadow-lg border-4 border-white bg-gray-300 overflow-hidden relative group cursor-pointer"
                title={isPhotoMarkedForDeletion ? "Click to add new photo" : "Click to view or edit photo"}
                onClick={() => {
                  if (!isPhotoMarkedForDeletion) {
                    const imageUrl = imagePreview || profile.personalInfo?.photo?.url;
                    if (imageUrl) {
                      setImageToShow(imageUrl);
                      setShowImageModal(true);
                    } else {
                      fileInputRef.current?.click();
                    }
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
              >
                {!isPhotoMarkedForDeletion && (imagePreview || profile.personalInfo?.photo?.url) ? (
                  <img 
                    src={imagePreview || profile.personalInfo?.photo?.url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white hover:bg-gray-400 transition-colors">
                    {profile.personalInfo?.name?.charAt(0) || '?'}
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-white text-sm">
                    {isPhotoMarkedForDeletion ? 'Click to add new photo' : 'Click to view or edit'}
                  </div>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            
            {/* Name Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={profile.personalInfo?.name || ''}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Your name"
              />
              {renderError(validationErrors.name, 'name')}
            </div>
            
            {/* Job Role Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Role</label>
              <input
                type="text"
                value={profile.professionalSummary?.currentRole || ''}
                onChange={(e) => {
                  setProfile((prev: Profile) => ({
                    ...prev,
                    professionalSummary: {
                      ...prev.professionalSummary,
                      currentRole: e.target.value
                    }
                  }));
                  setModifiedSections(prev => ({
                    ...prev,
                    professionalSummary: true
                  }));
                }}
                className="w-full p-2 border rounded-md"
                placeholder="Your current role"
              />
            </div>
            
            {/* Country Field - Searchable Dropdown */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                Country
              </label>
              <div className="relative">
              <input
                type="text"
                  value={countrySearchTerm || (profile.personalInfo?.country?.countryName || '')}
                  onChange={(e) => {
                    setCountrySearchTerm(e.target.value);
                    setIsCountryDropdownOpen(true);
                    setSelectedCountryIndex(-1); // Reset selection when typing
                    
                    // If user clears the field, reset the country selection
                    if (e.target.value === '') {
                      setSelectedCountry('');
                      handleProfileChange('country', '');
                    }
                  }}
                  onFocus={() => {
                    setIsCountryDropdownOpen(true);
                    setSelectedCountryIndex(-1); // Reset keyboard selection
                  }}
                  onBlur={() => {
                    // Delay closing to allow for selection
                    setTimeout(() => {
                      setIsCountryDropdownOpen(false);
                      
                      // Check if what the user typed matches any country exactly
                      if (countrySearchTerm && !selectedCountry) {
                        const exactMatch = countries.find(c => 
                          c.countryName.toLowerCase() === countrySearchTerm.toLowerCase()
                        );
                        if (exactMatch) {
                          setSelectedCountry(exactMatch.countryCode);
                          handleProfileChange('country', exactMatch._id);
                        }
                      }
                    }, 200);
                  }}
                  onKeyDown={(e) => {
                    if (!isCountryDropdownOpen) return;
                    
                    switch (e.key) {
                      case 'ArrowDown':
                        e.preventDefault();
                        setSelectedCountryIndex(prev => 
                          prev < filteredCountries.length - 1 ? prev + 1 : 0
                        );
                        break;
                      case 'ArrowUp':
                        e.preventDefault();
                        setSelectedCountryIndex(prev => 
                          prev > 0 ? prev - 1 : filteredCountries.length - 1
                        );
                        break;
                      case 'Enter':
                        e.preventDefault();
                        if (selectedCountryIndex >= 0 && filteredCountries[selectedCountryIndex]) {
                          const selectedCountry = filteredCountries[selectedCountryIndex];
                          setSelectedCountry(selectedCountry.countryCode);
                          setCountrySearchTerm(selectedCountry.countryName);
                          setIsCountryDropdownOpen(false);
                          handleProfileChange('country', selectedCountry._id);
                        }
                        break;
                      case 'Escape':
                        setIsCountryDropdownOpen(false);
                        break;
                    }
                  }}
                  placeholder="Search for your country... (use ↑↓ arrows to navigate)"
                className="w-full p-2 border rounded-md"
                />
                
                {/* Search Icon */}
                <div className="absolute right-2 top-2.5 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Dropdown List */}
                {isCountryDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                         {filteredCountries.length > 0 ? (
                       filteredCountries.map((country, index) => (
                         <button
                           key={country.countryCode}
                           type="button"
                           onClick={() => {
                             setSelectedCountry(country.countryCode);
                             setCountrySearchTerm(country.countryName);
                             setIsCountryDropdownOpen(false);
                             handleProfileChange('country', country._id);
                           }}
                           className={`w-full text-left px-3 py-2 flex items-center justify-between ${
                             index === selectedCountryIndex 
                               ? 'bg-blue-100 text-blue-700' 
                               : 'hover:bg-blue-50 hover:text-blue-600'
                           }`}
                         >
                           <span>{country.countryName}</span>
                           <span className="text-sm text-gray-500">{country.countryCode}</span>
                         </button>
                       ))
                     ) : (
                      <div className="px-3 py-2 text-gray-500 text-center">
                        No countries found matching "{countrySearchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              {renderError(validationErrors.country, 'country')}
              
              {/* Country mismatch warning */}
              {countryMismatch?.hasMismatch && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-orange-800">
                        <strong>Location Notice:</strong> You've selected <strong>{countryMismatch.selectedCountry}</strong>, but your first login was from <strong>{countryMismatch.firstLoginCountry}</strong>. Please verify your location is correct.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {checkingCountryMismatch && showLoadingSpinner && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">Validating profile information...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Contact Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={profile.personalInfo?.email || ''}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Your email address"
                />
                {renderError(validationErrors.email, 'email')}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={profile.personalInfo?.phone || ''}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Your phone number"
                />
                {renderError(validationErrors.phone, 'phone')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="md:col-span-8 space-y-6">
        {/* About Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">About</h2>
          
          {/* Profile Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={profile.professionalSummary?.profileDescription || ''}
              onChange={(e) => {
                setProfile((prev: Profile) => ({
                  ...prev,
                  professionalSummary: {
                    ...prev.professionalSummary,
                    profileDescription: e.target.value
                  }
                }));
                setModifiedSections(prev => ({
                  ...prev,
                  professionalSummary: true
                }));
              }}
              className="w-full p-2 border rounded-md min-h-[120px]"
              placeholder="Tell us about yourself, your background, and your expertise..."
            />
          </div>

          {/* Video Introduction Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-800">Video Introduction</h3>
                <p className="text-sm text-gray-600">Record a 1-minute video to introduce yourself</p>
              </div>
                             {!showVideoRecorder && !recordedVideo && (
                 <button
                   onClick={startCamera}
                   className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                 >
                   <Video className="w-4 h-4" />
                   Record Video
                 </button>
               )}
            </div>

            {/* Camera Permission Denied Message */}
            {cameraPermission === 'denied' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">
                      Camera access is required to record a video introduction. Please enable camera permissions in your browser settings and try again.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Video Recorder Interface */}
            {showVideoRecorder && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex flex-col items-center space-y-4">
                                     {/* Camera Preview */}
                   <div className="relative">
                     <video
                       ref={videoRef}
                       autoPlay
                       muted
                       playsInline
                       webkit-playsinline="true"
                       className="w-80 h-60 bg-black rounded-lg object-cover"
                     />
                                         {isRecording && (
                       <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                         <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                         REC
                       </div>
                     )}
                     
                     {/* Timer */}
                     <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm font-mono">
                       {formatTime(recordingTime)} / 1:00
                     </div>
                  </div>

                  {/* Recording Controls */}
                  <div className="flex items-center gap-4">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={!stream}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="w-4 h-4" />
                        Start Recording
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 transition-colors"
                      >
                        <Square className="w-4 h-4" />
                        Stop Recording
                      </button>
                    )}
                    
                    <button
                      onClick={stopCamera}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Recording Progress Bar */}
                  {recordingTime > 0 && (
                    <div className="w-80 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${(recordingTime / 60) * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recorded Video Preview */}
            {recordedVideo && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center justify-between w-full">
                    <h4 className="text-md font-medium text-gray-800">Your Video Introduction</h4>
                    <div className="flex gap-2">
                                             <button
                         onClick={async () => {
                           deleteVideo();
                           await startCamera();
                         }}
                         className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1 text-sm transition-colors"
                       >
                         <RotateCcw className="w-3 h-3" />
                         Re-record
                       </button>
                      <button
                        onClick={deleteVideo}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1 text-sm transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <video
                    ref={previewVideoRef}
                    src={recordedVideo}
                    controls
                    className="w-80 h-60 bg-black rounded-lg object-cover"
                  />
                  
                                     <div className="text-sm text-gray-600 text-center">
                     <div className="flex items-center justify-center gap-2 mb-2">
                       <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                       <span className="font-medium text-green-700">Video recorded successfully ({formatTime(recordingTime)})</span>
                     </div>
                     <p className="text-gray-500">Your video will be saved when you save your profile changes.</p>
                   </div>
                </div>
              </div>
            )}

            {/* No Video State */}
            {!showVideoRecorder && !recordedVideo && cameraPermission !== 'denied' && (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No video introduction yet</p>
                <p className="text-sm text-gray-500">Record a 1-minute video to help others get to know you better</p>
              </div>
            )}
          </div>
        </div>

        {/* Years of Experience Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Years of Experience</h2>
          <div className="mb-4">
            <input
              type="text"
              value={profile.professionalSummary?.yearsOfExperience || ''}
              onChange={(e) => {
                setProfile((prev: Profile) => ({
                  ...prev,
                  professionalSummary: {
                    ...prev.professionalSummary,
                    yearsOfExperience: e.target.value
                  }
                }));
                setModifiedSections(prev => ({
                  ...prev,
                  professionalSummary: true
                }));
              }}
              className="w-full p-2 border rounded-md"
              placeholder="e.g., 5"
            />
          </div>
        </div>
          
        {/* Industries Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Industries</h2>
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.professionalSummary?.industries?.map((industry: string, index: number) => (
              <div key={index} className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                <span className="text-blue-800 text-sm">{industry}</span>
                <button
                  onClick={() => {
                    const updatedIndustries = [...(profile.professionalSummary?.industries || [])];
                    updatedIndustries.splice(index, 1);
                    setProfile((prev: Profile) => ({
                      ...prev,
                      professionalSummary: {
                        ...prev.professionalSummary,
                        industries: updatedIndustries
                      }
                    }));
                    setModifiedSections(prev => ({
                      ...prev,
                      professionalSummary: true
                    }));
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tempIndustry}
              onChange={(e) => setTempIndustry(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Add industry"
            />
            <button
              onClick={() => {
                if (tempIndustry.trim()) {
                  const updatedIndustries = [
                    ...(profile.professionalSummary?.industries || []),
                    tempIndustry.trim()
                  ];
                  setProfile((prev: Profile) => ({
                    ...prev,
                    professionalSummary: {
                      ...prev.professionalSummary,
                      industries: updatedIndustries
                    }
                  }));
                  setModifiedSections(prev => ({
                    ...prev,
                    professionalSummary: true
                  }));
                  setTempIndustry('');
                }
              }}
              className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"
            >
              Add
            </button>
          </div>
        </div>

        {/* Notable Companies Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Notable Companies</h2>
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.professionalSummary?.notableCompanies?.map((company: string, index: number) => (
              <div key={index} className="flex items-center bg-purple-50 px-3 py-1 rounded-full">
                <span className="text-purple-800 text-sm">{company}</span>
                <button
                  onClick={() => {
                    const updatedCompanies = [...(profile.professionalSummary?.notableCompanies || [])];
                    updatedCompanies.splice(index, 1);
                    setProfile((prev: Profile) => ({
                      ...prev,
                      professionalSummary: {
                        ...prev.professionalSummary,
                        notableCompanies: updatedCompanies
                      }
                    }));
                    setModifiedSections(prev => ({
                      ...prev,
                      professionalSummary: true
                    }));
                  }}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tempCompany}
              onChange={(e) => setTempCompany(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Add notable company"
            />
            <button
              onClick={() => {
                if (tempCompany.trim()) {
                  const updatedCompanies = [
                    ...(profile.professionalSummary?.notableCompanies || []),
                    tempCompany.trim()
                  ];
                  setProfile((prev: Profile) => ({
                    ...prev,
                    professionalSummary: {
                      ...prev.professionalSummary,
                      notableCompanies: updatedCompanies
                    }
                  }));
                  setModifiedSections(prev => ({
                    ...prev,
                    professionalSummary: true
                  }));
                  setTempCompany('');
                }
              }}
              className="px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg"
            >
              Add
            </button>
          </div>
        </div>

        {/* Skills Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Skills</h2>
          
          {/* Technical Skills */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-3 text-blue-700">Technical Skills</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {getCurrentSkills('technical').map((skillRef: any, idx: number) => {
                const skillData = Object.values(skillsData.technical).flat().find((s: Skill) => s._id === skillRef.skill);
                return (
                  <div key={idx} className="flex items-center bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    <span className="text-blue-800 text-sm font-medium">{skillData?.name || 'Unknown'}</span>
                  <button
                      onClick={() => {
                        const updatedSkills = getCurrentSkills('technical').filter((_: any, i: number) => i !== idx);
                        handleSkillsChange('technical', updatedSkills);
                      }}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                );
              })}
            </div>
            {renderSkillDropdown('technical', 'Add Technical Skill', 'blue')}
          </div>
          
          {/* Professional Skills */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-3 text-green-700">Professional Skills</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {getCurrentSkills('professional').map((skillRef: any, idx: number) => {
                const skillData = Object.values(skillsData.professional).flat().find((s: Skill) => s._id === skillRef.skill);
                return (
                  <div key={idx} className="flex items-center bg-green-50 px-3 py-1 rounded-full border border-green-200">
                    <span className="text-green-800 text-sm font-medium">{skillData?.name || 'Unknown'}</span>
                  <button
                      onClick={() => {
                        const updatedSkills = getCurrentSkills('professional').filter((_: any, i: number) => i !== idx);
                        handleSkillsChange('professional', updatedSkills);
                      }}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                );
              })}
            </div>
            {renderSkillDropdown('professional', 'Add Professional Skill', 'green')}
          </div>
          
          {/* Soft Skills */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-3 text-purple-700">Soft Skills</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {getCurrentSkills('soft').map((skillRef: any, idx: number) => {
                const skillData = Object.values(skillsData.soft).flat().find((s: Skill) => s._id === skillRef.skill);
                return (
                  <div key={idx} className="flex items-center bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                    <span className="text-purple-800 text-sm font-medium">{skillData?.name || 'Unknown'}</span>
                  <button
                      onClick={() => {
                        const updatedSkills = getCurrentSkills('soft').filter((_: any, i: number) => i !== idx);
                        handleSkillsChange('soft', updatedSkills);
                      }}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                );
              })}
            </div>
            {renderSkillDropdown('soft', 'Add Soft Skill', 'purple')}
          </div>
        </div>
        
        {/* Experience Section */}
        <div className="bg-white rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Experience</h2>
            <button
              onClick={() => setShowNewExperienceForm(!showNewExperienceForm)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Experience
            </button>
          </div>
          
          {/* Add new experience form - Moved inside the card */}
          {showNewExperienceForm && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium mb-3">
                {editingExperienceId !== null ? 'Edit Experience' : 'Add New Experience'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title/Position</label>
                  <input
                    type="text"
                    value={newExperience.title}
                    onChange={(e) => setNewExperience(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                    placeholder="e.g., Customer Service Representative"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={newExperience.company}
                    onChange={(e) => setNewExperience(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                    placeholder="e.g., ABC Corporation"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newExperience.startDate}
                    onChange={(e) => setNewExperience(prev => ({ ...prev, startDate: e.target.value }))}
                    className="flex-1 p-2 border rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={newExperience.endDate}
                      onChange={(e) => setNewExperience(prev => ({ ...prev, endDate: e.target.value }))}
                      className="flex-1 p-2 border rounded-md"
                      disabled={newExperience.isPresent}
                    />
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={newExperience.isPresent}
                        onChange={(e) => setNewExperience(prev => ({ 
                          ...prev, 
                          isPresent: e.target.checked,
                          endDate: e.target.checked ? '' : prev.endDate 
                        }))}
                      />
                      Present
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
                {newExperience.responsibilities.map((responsibility, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={responsibility}
                      onChange={(e) => {
                        const updatedResponsibilities = [...newExperience.responsibilities];
                        updatedResponsibilities[index] = e.target.value;
                        setNewExperience(prev => ({ ...prev, responsibilities: updatedResponsibilities }));
                      }}
                      className="flex-1 p-2 border rounded-md"
                      placeholder={`Responsibility ${index + 1}`}
                    />
                    <button
                      onClick={() => {
                        if (newExperience.responsibilities.length > 1) {
                          const updatedResponsibilities = [...newExperience.responsibilities];
                          updatedResponsibilities.splice(index, 1);
                          setNewExperience(prev => ({ ...prev, responsibilities: updatedResponsibilities }));
                        }
                      }}
                      className="p-2 text-red-500 hover:text-red-700"
                      disabled={newExperience.responsibilities.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setNewExperience(prev => ({
                    ...prev,
                    responsibilities: [...prev.responsibilities, '']
                  }))}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mt-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Responsibility
                </button>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowNewExperienceForm(false);
                    setEditingExperienceId(null);
                    setNewExperience({
                      title: '',
                      company: '',
                      startDate: '',
                      endDate: '',
                      responsibilities: [''],
                      isPresent: false
                    });
                  }}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingExperienceId !== null) {
                      saveEditedExperience();
                    } else {
                      // Create formatted experience object
                      const newExp = {
                        title: newExperience.title,
                        company: newExperience.company,
                        startDate: newExperience.startDate,
                        endDate: newExperience.isPresent ? 'present' : newExperience.endDate,
                        responsibilities: newExperience.responsibilities.filter(r => r.trim())
                      };
                      
                      // Add to profile and update state
                      const updatedExperience = [...(profile.experience || []), newExp];
                      setProfile((prev: Profile) => ({
                        ...prev,
                        experience: updatedExperience
                      }));
                      
                      // Mark experience section as modified
                      setModifiedSections(prev => ({
                        ...prev,
                        experience: true
                      }));
                      
                      // Reset form
                      setShowNewExperienceForm(false);
                      setNewExperience({
                        title: '',
                        company: '',
                        startDate: '',
                        endDate: '',
                        responsibilities: [''],
                        isPresent: false
                      });
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={!newExperience.title || !newExperience.company || !newExperience.startDate || loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      Saving...
                    </>
                  ) : (
                    editingExperienceId !== null ? 'Save Changes' : 'Save Experience'
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* Experience List */}
          <div className="space-y-4">
            {profile.experience?.map((exp: any, index: number) => (
              <div key={index} className="border-l-2 border-blue-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800">{exp.title}</h3>
                    <p className="text-gray-600">{exp.company}</p>
                    <p className="text-sm text-gray-500">
                      {exp.startDate ? formatDate(exp.startDate) : 'N/A'} - {
                        exp.endDate === 'present' ? 'Present' : 
                        exp.endDate ? formatDate(exp.endDate) : 'N/A'
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditingExperience(index)}
                      className="p-1 text-blue-500 hover:text-blue-700"
                      title="Edit experience"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const updatedExperience = [...profile.experience];
                        updatedExperience.splice(index, 1);
                        setProfile((prev: Profile) => ({
                          ...prev,
                          experience: updatedExperience
                        }));
                        
                        // Mark experience section as modified
                        setModifiedSections(prev => ({
                          ...prev,
                          experience: true
                        }));
                      }}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Delete experience"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {exp.responsibilities?.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-gray-700">Responsibilities:</h4>
                    <ul className="list-disc pl-5 space-y-1 mt-1">
                      {exp.responsibilities.map((responsibility: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600">{responsibility}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            
            {(!profile.experience || profile.experience.length === 0) && (
              <p className="text-gray-500 italic text-center py-4">No experience entries yet</p>
            )}
          </div>
        </div>

        {/* Languages Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Languages</h2>
          
          {/* Current Languages */}
          <div className="space-y-2 mb-4">
            {profile.personalInfo?.languages?.map((lang: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">
                    {getLanguageDisplayName(lang)}
                    {getLanguageCode(lang) && <span className="text-gray-500 ml-1">({getLanguageCode(lang)})</span>}
                  </span>
                  <span className="ml-2 text-sm text-blue-600">({lang.proficiency})</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={lang.proficiency}
                    onChange={(e) => {
                      updateLanguageProficiency(index, e.target.value);
                      setModifiedSections(prev => ({
                        ...prev,
                        languages: true
                      }));
                    }}
                    className="text-sm p-1 border rounded"
                  >
                    {proficiencyLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => {
                      removeLanguage(index);
                      setModifiedSections(prev => ({
                        ...prev,
                        languages: true
                      }));
                    }}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Add Language Form */}
          <div className="mt-4">
            <div className="flex gap-2 mb-2">
              {/* Language Dropdown with Search */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={languageSearchTerm}
                  onChange={(e) => {
                    setLanguageSearchTerm(e.target.value);
                    setIsLanguageDropdownOpen(true);
                    setSelectedLanguageIndex(-1);
                  }}
                  onFocus={() => {
                    setIsLanguageDropdownOpen(true);
                    setSelectedLanguageIndex(-1);
                  }}
                  onBlur={() => {
                    setTimeout(() => setIsLanguageDropdownOpen(false), 200);
                  }}
                  onKeyDown={(e) => {
                    if (!isLanguageDropdownOpen) return;
                    
                    switch (e.key) {
                      case 'ArrowDown':
                        e.preventDefault();
                        setSelectedLanguageIndex(prev => 
                          prev < filteredLanguages.length - 1 ? prev + 1 : 0
                        );
                        break;
                      case 'ArrowUp':
                        e.preventDefault();
                        setSelectedLanguageIndex(prev => 
                          prev > 0 ? prev - 1 : filteredLanguages.length - 1
                        );
                        break;
                      case 'Enter':
                        e.preventDefault();
                        if (selectedLanguageIndex >= 0 && filteredLanguages[selectedLanguageIndex]) {
                          addLanguage(filteredLanguages[selectedLanguageIndex]);
                        }
                        break;
                      case 'Escape':
                        setIsLanguageDropdownOpen(false);
                        break;
                    }
                  }}
                  placeholder="Search for a language... (use ↑↓ arrows to navigate)"
                  className="w-full p-2 border rounded-md"
                  disabled={loadingLanguages}
                />
                
                {/* Search Icon */}
                <div className="absolute right-2 top-2.5 text-gray-400">
                  {loadingLanguages ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>

                {/* Language Dropdown List */}
                {isLanguageDropdownOpen && !loadingLanguages && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredLanguages.length > 0 ? (
                      filteredLanguages.map((language, index) => (
                        <button
                          key={language._id}
                          type="button"
                          onClick={() => addLanguage(language)}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between ${
                            index === selectedLanguageIndex 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'hover:bg-blue-50 hover:text-blue-600'
                          }`}
                        >
                          <div>
                            <span className="font-medium">{language.name}</span>
                            <div className="text-sm text-gray-500">{language.nativeName}</div>
                          </div>
                          <span className="text-sm text-gray-500 font-mono">{language.code}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-center">
                        {languageSearchTerm ? `No languages found matching "${languageSearchTerm}"` : 'No languages available'}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Proficiency Level Selector */}
              <select
                value={tempLanguage.proficiency}
                onChange={(e) => setTempLanguage((prev: any) => ({ ...prev, proficiency: e.target.value }))}
                className="w-24 p-2 border rounded-md"
                disabled={loadingLanguages}
              >
                {proficiencyLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.value}
                  </option>
                ))}
              </select>
            </div>
            
            {renderError(validationErrors.languages, 'languages')}
          </div>
        </div>

        {/* Availability Section */}
        <div className="bg-white rounded-lg p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Working Hours & Availability</h2>
            </div>
          </div>

          {/* Default Working Hours */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Add New Schedule</h3>
              <div className="flex items-center gap-4 max-w-md">
                <input
                  type="time"
                  defaultValue="09:00"
                  id="defaultStartTime"
                  className="w-32 p-2 border rounded"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="time"
                  defaultValue="17:00"
                  id="defaultEndTime"
                  className="w-32 p-2 border rounded"
                />
                <button
                  onClick={() => {
                    const startInput = document.getElementById('defaultStartTime') as HTMLInputElement;
                    const endInput = document.getElementById('defaultEndTime') as HTMLInputElement;
                    const defaultStart = startInput?.value || '09:00';
                    const defaultEnd = endInput?.value || '17:00';
                    
                    // Get currently unscheduled days
                    const scheduledDays = new Set(profile.availability.schedule.map(s => s.day));
                    const unscheduledDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                      .filter(day => !scheduledDays.has(day));
                    
                    // Add schedule for unscheduled weekdays
                    const newScheduleItems = unscheduledDays.map(day => ({
                      day,
                      hours: { start: defaultStart, end: defaultEnd }
                    }));
                    
                    const newSchedule = [...profile.availability.schedule, ...newScheduleItems];
                    updateSchedule(newSchedule);
                  }}
                  className="px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                >
                  Apply to Weekdays
                </button>
              </div>
            </div>

            {/* Working Days Schedule */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">Working Days</h3>
              <div className="space-y-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day: string) => {
                  const daySchedule = profile.availability.schedule.find((s: ScheduleDay) => s.day === day);
                  return (
                    <div
                      key={day}
                      className={`p-4 rounded-lg border ${
                        daySchedule 
                          ? 'border-blue-200 bg-blue-50 shadow-sm' 
                          : 'border-gray-200 bg-white hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{day}</span>
                        <div className="flex items-center gap-8">
                          {daySchedule && (
                            <div className="flex items-center gap-6">
                              <div className="flex-1 min-w-[140px]">
                                <label className="block text-xs text-gray-500 mb-1">Start</label>
                                <input
                                  type="time"
                                  value={daySchedule.hours.start}
                                  onChange={(e) => {
                                    const newSchedule = profile.availability.schedule.map(s => 
                                      s.day === day 
                                        ? { ...s, hours: { ...s.hours, start: e.target.value } }
                                        : s
                                    );
                                    updateSchedule(newSchedule);
                                  }}
                                  className="w-full p-2 border rounded bg-white text-sm"
                                />
                              </div>
                              <div className="flex-1 min-w-[140px]">
                                <label className="block text-xs text-gray-500 mb-1">End</label>
                                <input
                                  type="time"
                                  value={daySchedule.hours.end}
                                  onChange={(e) => {
                                    const newSchedule = profile.availability.schedule.map(s => 
                                      s.day === day 
                                        ? { ...s, hours: { ...s.hours, end: e.target.value } }
                                        : s
                                    );
                                    updateSchedule(newSchedule);
                                  }}
                                  className="w-full p-2 border rounded bg-white text-sm"
                                />
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              const startInput = document.getElementById('defaultStartTime') as HTMLInputElement;
                              const endInput = document.getElementById('defaultEndTime') as HTMLInputElement;
                              const defaultStart = startInput?.value || '09:00';
                              const defaultEnd = endInput?.value || '17:00';
                              
                              const currentSchedule = profile.availability.schedule;
                              let newSchedule;
                              
                              if (daySchedule) {
                                newSchedule = currentSchedule.filter(s => s.day !== day);
                              } else {
                                newSchedule = [
                                  ...currentSchedule,
                                  {
                                    day,
                                    hours: {
                                      start: defaultStart,
                                      end: defaultEnd
                                    }
                                  }
                                ];
                              }
                              updateSchedule(newSchedule);
                            }}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                              daySchedule 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {daySchedule ? 'Remove' : 'Add'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time Zone */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Time Zone</h3>
            <div className="relative">
              <input
                type="text"
                value={timezoneSearchTerm}
                onChange={(e) => {
                  setTimezoneSearchTerm(e.target.value);
                  setIsTimezoneDropdownOpen(true);
                  setSelectedTimezoneIndex(-1); // Reset selection when typing
                  
                  // If user clears the field, reset the timezone selection
                  if (e.target.value === '') {
                    setProfile((prev: Profile) => ({
                      ...prev,
                      availability: {
                        ...prev.availability,
                        timeZone: ''
                      }
                    }));
                    setModifiedSections(prev => ({
                      ...prev,
                      availability: true
                    }));
                  }
                }}
                onFocus={() => {
                  setIsTimezoneDropdownOpen(true);
                  setSelectedTimezoneIndex(-1); // Reset keyboard selection
                }}
                onBlur={() => {
                  // Delay closing to allow for selection
                  setTimeout(() => {
                    setIsTimezoneDropdownOpen(false);
                    
                    // Check if what the user typed matches any timezone exactly
                    if (timezoneSearchTerm && (!profile.availability.timeZone || profile.availability.timeZone === '' || profile.availability.timeZone === null)) {
                      const exactMatch = filteredTimezones.find(tz => 
                        repWizardApi.formatTimezone(tz).toLowerCase() === timezoneSearchTerm.toLowerCase()
                      );
                      if (exactMatch) {
                        setProfile((prev: Profile) => ({
                          ...prev,
                          availability: {
                            ...prev.availability,
                            timeZone: exactMatch._id
                          }
                        }));
                        setModifiedSections(prev => ({
                          ...prev,
                          availability: true
                        }));
                      }
                    }
                  }, 200);
                }}
                onKeyDown={(e) => {
                  if (!isTimezoneDropdownOpen) return;
                  
                  switch (e.key) {
                    case 'ArrowDown':
                      e.preventDefault();
                      setSelectedTimezoneIndex(prev => 
                        prev < filteredTimezones.length - 1 ? prev + 1 : 0
                      );
                      break;
                    case 'ArrowUp':
                      e.preventDefault();
                      setSelectedTimezoneIndex(prev => 
                        prev > 0 ? prev - 1 : filteredTimezones.length - 1
                      );
                      break;
                    case 'Enter':
                      e.preventDefault();
                      if (selectedTimezoneIndex >= 0 && filteredTimezones[selectedTimezoneIndex]) {
                        const selectedTimezone = filteredTimezones[selectedTimezoneIndex];
                        setProfile((prev: Profile) => ({
                          ...prev,
                          availability: {
                            ...prev.availability,
                            timeZone: selectedTimezone._id
                          }
                        }));
                        setModifiedSections(prev => ({
                          ...prev,
                          availability: true
                        }));
                        setTimezoneSearchTerm(repWizardApi.formatTimezone(selectedTimezone));
                        setIsTimezoneDropdownOpen(false);
                      }
                      break;
                    case 'Escape':
                      setIsTimezoneDropdownOpen(false);
                      break;
                  }
                }}
                placeholder="Search for your time zone... (use ↑↓ arrows to navigate)"
                className="w-full p-2 border rounded-md"
              />
              
              {/* Search Icon */}
              <div className="absolute right-2 top-2.5 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Dropdown List */}
              {isTimezoneDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {/* Show suggested timezones first if country is selected */}
                  {selectedCountry && timezones.length > 0 && filteredTimezones.some(tz => timezones.some(suggestedTz => suggestedTz._id === tz._id)) && (
                    <>
                      <div className="px-3 py-2 text-sm font-medium bg-blue-100 text-blue-700 border-b">
                        Suggested for {countries.find(c => c.countryCode === selectedCountry)?.countryName || selectedCountry}
                      </div>
                      {filteredTimezones
                        .filter(tz => timezones.some(suggestedTz => suggestedTz._id === tz._id))
                        .map((timezone, index) => {
                          const globalIndex = filteredTimezones.indexOf(timezone);
                          return (
                            <button
                              key={timezone._id}
                              type="button"
                              onClick={() => {
                                setProfile((prev: Profile) => ({
                                  ...prev,
                                  availability: {
                                    ...prev.availability,
                                    timeZone: timezone._id
                                  }
                                }));
                                setModifiedSections(prev => ({
                                  ...prev,
                                  availability: true
                                }));
                                setTimezoneSearchTerm(repWizardApi.formatTimezone(timezone));
                                setIsTimezoneDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between ${
                                globalIndex === selectedTimezoneIndex 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'hover:bg-blue-50 hover:text-blue-600'
                              }`}
                            >
                              <span>{repWizardApi.formatTimezone(timezone)}</span>
                            </button>
                          );
                        })}
                    </>
                  )}
                  
                  {/* Show all other matching timezones */}
                  {filteredTimezones.filter(tz => !timezones.some(suggestedTz => suggestedTz._id === tz._id)).length > 0 && (
                    <>
                      <div className="px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 border-b">
                        All Time Zones
                      </div>
                      {filteredTimezones
                        .filter(tz => !timezones.some(suggestedTz => suggestedTz._id === tz._id))
                        .map((timezone) => {
                          const globalIndex = filteredTimezones.indexOf(timezone);
                          return (
                            <button
                              key={timezone._id}
                              type="button"
                              onClick={() => {
                                setProfile((prev: Profile) => ({
                                  ...prev,
                                  availability: {
                                    ...prev.availability,
                                    timeZone: timezone._id
                                  }
                                }));
                                setModifiedSections(prev => ({
                                  ...prev,
                                  availability: true
                                }));
                                setTimezoneSearchTerm(repWizardApi.formatTimezone(timezone));
                                setIsTimezoneDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between ${
                                globalIndex === selectedTimezoneIndex 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'hover:bg-blue-50 hover:text-blue-600'
                              }`}
                            >
                              <span>{repWizardApi.formatTimezone(timezone)}</span>
                            </button>
                          );
                        })}
                    </>
                  )}

                  {filteredTimezones.length === 0 && (
                    <div className="px-3 py-2 text-gray-500 text-center">
                      No timezones found matching "{timezoneSearchTerm}"
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Timezone mismatch warning */}
            {(() => {
              const mismatchInfo = getTimezoneMismatchInfo();
              if (mismatchInfo) {
                return (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-amber-800">
                          Your timezone is set to <strong>{mismatchInfo.timezoneCountry}</strong>, but your country is <strong>{mismatchInfo.selectedCountry}</strong>. This is fine if you work across time zones.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {selectedCountry && timezones.length === 0 && !loadingTimezones && (
              <p className="text-sm text-gray-500 mt-1">No timezones available for this country</p>
            )}
          </div>

          {/* Schedule Flexibility */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Schedule Flexibility</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {[
                'Remote Work Available',
                'Flexible Hours',
                'Weekend Rotation',
                'Night Shift Available',
                'Split Shifts',
                'Part-Time Options',
                'Compressed Work Week',
                'Shift Swapping Allowed'
              ].map((option) => {
                const isSelected = profile.availability.flexibility.includes(option);
                return (
                  <button
                    key={option}
                    onClick={() => {
                      const currentFlexibility = profile.availability.flexibility;
                      const updatedFlexibility = isSelected
                        ? currentFlexibility.filter((f: string) => f !== option)
                        : [...currentFlexibility, option];
                      
                      updateFlexibility(updatedFlexibility);
                    }}
                    className={`px-4 py-2 rounded text-sm w-full ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {showCropModal && tempImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6" style={{ width: `${imageDimensions.width + 48}px` }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Crop Profile Picture</h3>
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setTempImage(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex items-center justify-center">
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imageRef}
                  src={tempImage}
                  alt="Crop preview"
                  style={{
                    width: `${imageDimensions.width}px`,
                    height: `${imageDimensions.height}px`,
                    objectFit: 'contain'
                  }}
                />
              </ReactCrop>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setTempImage(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCropComplete}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Updated Image Modal */}
      {showImageModal && imageToShow && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowImageModal(false);
            setImageToShow(null);
          }}
        >
          <div 
            className="relative w-[30%] min-w-[300px] bg-white rounded-lg overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">My Profile Image</h3>
            </div>

            {/* Close button */}
            <button
              className="absolute top-4 right-4 p-2 bg-white rounded-full text-gray-600 hover:text-gray-900 shadow-lg z-10"
              onClick={() => {
                setShowImageModal(false);
                setImageToShow(null);
              }}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Main image */}
            <div className="p-4">
              <img
                src={imageToShow}
                alt={profile.personalInfo?.name || 'Profile'}
                className="w-full h-auto object-contain rounded-lg"
                style={{ maxHeight: '70vh' }}
              />
            </div>

            {/* Action buttons */}
            <div className="border-t border-gray-200 bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowImageModal(false);
                    setImageToShow(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Change Photo
                </button>
                {(imagePreview || profile.personalInfo?.photo?.url) && !isPhotoMarkedForDeletion && (
                  <button
                    onClick={() => {
                      handleRemoveImage();
                      setShowImageModal(false);
                      setImageToShow(null);
                    }}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                )}
                {isPhotoMarkedForDeletion && (
                  <button
                    onClick={() => {
                      setIsPhotoMarkedForDeletion(false);
                      setImagePreview(profile.personalInfo?.photo?.url || null);
                      setModifiedSections(prev => ({
                        ...prev,
                        profileImage: false
                      }));
                      showToast('Photo deletion cancelled', 'success');
                    }}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Restore Photo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transition-all transform duration-500 ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {toast.type === 'success' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}; 