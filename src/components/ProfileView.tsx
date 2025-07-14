import React, { useEffect, useState } from 'react';
import { 
  MapPin, Mail, Phone, Linkedin, Github, Target, Clock, Briefcase, 
  Calendar, GraduationCap, Medal, Star, ThumbsUp, ThumbsDown, Trophy,
  Edit, CreditCard, X
} from 'lucide-react';
import { getProfilePlan, checkCountryMismatch } from '../utils/profileUtils';
import { repWizardApi, Timezone } from '../services/api/repWizard';
// Type definitions
interface AssessmentResults {
  score?: number;
  fluency?: { score: number };
  proficiency?: { score: number };
  completeness?: { score: number };
  keyMetrics?: {
    professionalism: number;
    effectiveness: number;
    customerFocus: number;
  };
}

interface Language {
  language: string;
  proficiency: string;
  iso639_1?: string;
  assessmentResults?: AssessmentResults;
}

interface ContactCenterSkill {
  skill: string;
  proficiency?: string;
  assessmentResults?: AssessmentResults;
}

// Add new interface for Plan
interface Plan {
  _id: string;
  name: string;
  price: number;
  targetUserType: string;
  createdAt: string;
  updatedAt: string;
}

interface PlanResponse {
  _id: string;
  userId: string;
  plan: Partial<Plan>;  // Using Partial to allow empty object
}

// Add these interfaces near the top with other interfaces
interface AvailabilityHours {
  start: string;
  end: string;
}

interface ScheduleDay {
  day: string;
  hours: AvailabilityHours;
}

interface Availability {
  schedule?: ScheduleDay[];
  timeZone?: string;
  flexibility?: string[];
}

interface Profile {
  _id: string;
  personalInfo: {
    name?: string;
    country?: Timezone | string;
    email?: string;
    phone?: string;
    photo?: {
      url: string;
      publicId: string;
    };
    languages?: Language[];
  };
  professionalSummary?: {
    currentRole?: string;
    yearsOfExperience?: string;
    profileDescription?: string;
    industries?: string[];
    notableCompanies?: string[];
  };
  skills?: {
    technical?: any[];
    professional?: any[];
    soft?: any[];
    contactCenter?: ContactCenterSkill[];
  };
  experience?: any[];
  availability?: Availability;
  plan?: PlanResponse;
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

export const ProfileView: React.FC<{ profile: any, onEditClick: () => void }> = ({ profile, onEditClick }) => {
  const [planData, setPlanData] = useState<PlanResponse | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [countryData, setCountryData] = useState<Timezone | null>(null);
  const [timezoneData, setTimezoneData] = useState<Timezone | null>(null);
  const [allTimezones, setAllTimezones] = useState<Timezone[]>([]);
  const [countries, setCountries] = useState<Timezone[]>([]);
  
  // Add state for country mismatch checking
  const [countryMismatch, setCountryMismatch] = useState<{
    hasMismatch: boolean;
    firstLoginCountry?: string;
    selectedCountry?: string;
    firstLoginCountryCode?: string;
  } | null>(null);
  const [checkingCountryMismatch, setCheckingCountryMismatch] = useState(false);

  // Add console logging
  useEffect(() => {
    console.log('Profile View - Full Profile Data:', profile);
    console.log('Profile View - Availability Data:', profile.availability);
  }, [profile]);

  // Load countries and all timezones on component mount
  useEffect(() => {
    const loadLocationData = async () => {
      try {
        console.log('🌍 Loading countries and timezones...');
        const [countriesData, timezonesData] = await Promise.all([
          repWizardApi.getCountries(),
          repWizardApi.getTimezones()
        ]);
        setCountries(countriesData);
        setAllTimezones(timezonesData);
        console.log('✅ Countries and timezones loaded:', countriesData.length, timezonesData.length);
      } catch (error) {
        console.error('❌ Error loading location data:', error);
      }
    };

    loadLocationData();
  }, []);

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        if (!profile?._id) return;
        
        const data = await getProfilePlan(profile._id);
        // Convert the response to match our interface
        const planResponse: PlanResponse = {
          _id: String(data._id),
          userId: String(data.userId),
          plan: data.plan
        };
        setPlanData(planResponse);
      } catch (error) {
        console.error('Error fetching plan data:', error);
        setPlanError(error instanceof Error ? error.message : 'Failed to fetch plan data');
      }
    };

    fetchPlanData();
  }, [profile?._id]);

  // Load country and timezone data
  useEffect(() => {
    const loadLocationData = async () => {
      try {
        // Handle country data - either as string ID or object
        if (profile?.personalInfo?.country) {
          if (typeof profile.personalInfo.country === 'string') {
            // Country is an ID, fetch the country data
            const country = await repWizardApi.getTimezoneById(profile.personalInfo.country);
            setCountryData(country);
          } else if (typeof profile.personalInfo.country === 'object') {
            // Country is already an object, use it directly
            setCountryData(profile.personalInfo.country);
          }
        }

        // Handle timezone data - either as string ID or object
        if (profile?.availability?.timeZone) {
          if (typeof profile.availability.timeZone === 'string') {
            // Timezone is an ID, fetch the timezone data
            const timezone = await repWizardApi.getTimezoneById(profile.availability.timeZone);
            setTimezoneData(timezone);
          } else if (typeof profile.availability.timeZone === 'object') {
            // Timezone is already an object, use it directly
            setTimezoneData(profile.availability.timeZone);
          }
        }
      } catch (error) {
        console.error('Error loading location data:', error);
      }
    };

    loadLocationData();
  }, [profile?.personalInfo?.country, profile?.availability?.timeZone]);

  // Add useEffect to check country mismatch
  useEffect(() => {
    const checkMismatch = async () => {
      if (!countryData || countries.length === 0) {
        return;
      }

      try {
        setCheckingCountryMismatch(true);
        console.log('🔍 Checking country mismatch for selected country:', countryData.countryCode);
        
        const mismatchResult = await checkCountryMismatch(
          countryData.countryCode, 
          countries
        );
        
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
      }
    };

    checkMismatch();
  }, [countryData, countries]);

  if (!profile) return null;

  // Get timezone and country mismatch info
  const getTimezoneMismatchInfo = () => {
    const currentTimezoneId = typeof profile.availability?.timeZone === 'object' 
      ? profile.availability.timeZone._id 
      : profile.availability?.timeZone;
    
    const selectedTimezoneData = allTimezones.find(tz => tz._id === currentTimezoneId);
    
    if (!countryData || !selectedTimezoneData || !currentTimezoneId) {
      return null;
    }
    
    // Check if timezone belongs to selected country
    const timezoneCountry = selectedTimezoneData.countryCode;
    const selectedCountryCode = countryData.countryCode;
    
    if (timezoneCountry !== selectedCountryCode) {
      const timezoneCountryData = countries.find(c => c.countryCode === timezoneCountry);
      return {
        timezoneCountry: timezoneCountryData?.countryName || timezoneCountry,
        selectedCountry: countryData.countryName,
        timezoneName: selectedTimezoneData.zoneName
      };
    }
    
    return null;
  };

  // Calculate average score from contact center skills if available
  const calculateOverallScore = () => {
    if (!profile.skills?.contactCenter?.length || 
        !profile.skills.contactCenter[0]?.assessmentResults?.keyMetrics) {
      return 'N/A';
    }
    
    const metrics = profile.skills.contactCenter[0].assessmentResults.keyMetrics;
    const professionalism = metrics.professionalism || 0;
    const effectiveness = metrics.effectiveness || 0;
    const customerFocus = metrics.customerFocus || 0;
    
    return Math.floor((professionalism + effectiveness + customerFocus) / 3);
  };

  const overallScore = calculateOverallScore();
  const lastUpdated = formatDate(profile.lastUpdated);

  // Helper function to find skill data from profile
  const findSkillData = (skillName: string) => {
    if (!profile.skills?.contactCenter?.length) return null;
    return profile.skills.contactCenter.find((s: any) => s.skill === skillName);
  };

  // Function to get ISO 639-1 code from language name (fallback)
  const getIso639CodeFromLanguage = (langName: string): string => {
    const langMap: Record<string, string> = {
      'english': 'en',
      'french': 'fr',
      'spanish': 'es',
      'german': 'de',
      'italian': 'it',
      'portuguese': 'pt',
      'russian': 'ru',
      'chinese': 'zh',
      'japanese': 'ja',
      'korean': 'ko',
      'arabic': 'ar',
      'hindi': 'hi',
      'bengali': 'bn',
      'dutch': 'nl',
      'swedish': 'sv',
      'norwegian': 'no',
      'danish': 'da',
      'finnish': 'fi',
      'polish': 'pl',
      'turkish': 'tr',
      'greek': 'el',
      'thai': 'th',
      'vietnamese': 'vi',
      // Add more as needed
    };
    
    return langMap[langName.toLowerCase()] || 'en';
  };
  
  // Function to take a language assessment
  const takeLanguageAssessment = (language: string, iso639_1Code?: string) => {
    // If iso639_1 is not provided, just use the language name directly
    const langParameter = iso639_1Code || language;
    
    // Check if we're in standalone mode
    const isStandaloneMode = import.meta.env.VITE_RUN_MODE === 'standalone';
    // Use the appropriate assessment app URL based on the mode
    const assessmentAppUrl = isStandaloneMode 
      ? import.meta.env.VITE_ASSESSMENT_APP_STANDALONE 
      : import.meta.env.VITE_ASSESSMENT_APP;
    
    const assessmentUrl = `${assessmentAppUrl}/language/${langParameter}`;
    console.log("assessmentUrl language", assessmentUrl);
    window.open(assessmentUrl, '_blank');
  };

  // Format skill name for URL (e.g., "Active Listening" -> "active-listening")
  const formatSkillForUrl = (skillName: string): string => {
    return skillName.toLowerCase().replace(/\s+/g, '-');
  };

  // Function to take a contact center skill assessment
  const takeContactCenterSkillAssessment = (skillName: string) => {
    const formattedSkill = formatSkillForUrl(skillName);
    
    // Check if we're in standalone mode
    const isStandaloneMode = import.meta.env.VITE_RUN_MODE === 'standalone';
    // Use the appropriate assessment app URL based on the mode
    const assessmentAppUrl = isStandaloneMode 
      ? import.meta.env.VITE_ASSESSMENT_APP_STANDALONE 
      : import.meta.env.VITE_ASSESSMENT_APP;
    
    const assessmentUrl = `${assessmentAppUrl}/contact-center/${formattedSkill}`;
    console.log("assessmentUrl contact center", assessmentUrl);
    window.open(assessmentUrl, '_blank');
  };

  // Helper function to format skills for display
  const formatSkillsForDisplay = (skillsData: any) => {
    // Handle the populated format (array of skills with nested skill objects)
    if (Array.isArray(skillsData)) {
      return skillsData.map(skillItem => {
        // Handle different skill formats
        if (typeof skillItem === 'string') {
          // Old format: just a string
          return {
            name: skillItem,
            details: ''
          };
        } else if (skillItem.skill && typeof skillItem.skill === 'object') {
          // New populated format: skill object nested under 'skill' property
          return {
            _id: skillItem.skill._id,
            name: skillItem.skill.name,
            description: skillItem.skill.description,
            category: skillItem.skill.category,
            details: skillItem.details || ''
          };
        } else if (skillItem.skill && typeof skillItem.skill === 'string') {
          // Format with ObjectId reference
          return {
            name: skillItem.skill,
            details: skillItem.details || ''
          };
        } else if (skillItem.name) {
          // Already populated format
          return {
            name: skillItem.name,
            details: skillItem.details || ''
          };
        } else {
          // Unknown format
          return {
            name: skillItem._id || 'Unknown',
            details: skillItem.details || ''
          };
        }
      });
    }
    
    return [];
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 p-6">
      {/* Page Header with Edit Button */}
      <div className="md:col-span-12 flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Profile Information</h1>
        <button
          onClick={onEditClick}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit Profile
        </button>
      </div>

      {/* Left Column */}
      <div className="md:col-span-4 space-y-6">
        {/* Profile Header */}
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">
            <div className="mb-6">
              <div 
                className="w-32 h-32 rounded-full mx-auto shadow-lg border-4 border-white bg-gray-300 overflow-hidden relative group cursor-pointer"
                title="Click to view photo"
                onClick={() => profile.personalInfo?.photo?.url && setShowImageModal(true)}
              >
                {profile.personalInfo?.photo?.url ? (
                  <>
                    <img 
                      src={profile.personalInfo.photo.url} 
                      alt={profile.personalInfo?.name || 'Profile'} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-white text-sm">Click to view</div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                    {profile.personalInfo?.name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{profile.personalInfo?.name}</h1>
            <p className="text-lg text-gray-600 mb-4">{profile.professionalSummary?.currentRole || 'Representative'}</p>
            <div className="flex items-center justify-center gap-2 text-gray-600 mb-4">
              <MapPin className="w-4 h-4" />
              <span>{countryData?.countryName || 'Country not specified'}</span>
            </div>
            
            {/* Country mismatch warning */}
            {countryMismatch?.hasMismatch && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-orange-800">
                      <strong>Location Notice:</strong> Your profile shows <strong>{countryMismatch.selectedCountry}</strong>, but your first login was from <strong>{countryMismatch.firstLoginCountry}</strong>. Please verify your location settings.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {checkingCountryMismatch && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">Verifying location information...</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-center gap-4 text-gray-600">
              {profile.personalInfo?.email && (
                <a href={`mailto:${profile.personalInfo.email}`} className="hover:text-blue-600">
                  <Mail className="w-5 h-5" />
                </a>
              )}
              {profile.personalInfo?.phone && (
                <a href={`tel:${profile.personalInfo.phone}`} className="hover:text-blue-600">
                  <Phone className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Plan Card */}
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold">Subscription Plan</h2>
          </div>
          {planError ? (
            <div className="text-red-600 text-sm mb-2">{planError}</div>
          ) : planData && Object.keys(planData.plan).length > 0 ? (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-blue-800">
                    {planData.plan.name}
                  </h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    Active
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-3">
                  ${planData.plan.price}
                  <span className="text-sm text-blue-400 font-normal">/month</span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    Type: {planData.plan.targetUserType}
                  </p>
                  <p className="flex items-center gap-2">
                    Start Date: {planData.plan.createdAt ? new Date(planData.plan.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 px-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="mb-3">
                <svg className="w-12 h-12 text-blue-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-blue-800 mb-2">Subscription Plan Not Selected</h3>
              <p className="text-sm text-blue-600">
                You haven't selected a subscription plan yet. Choose a plan to unlock all features.
              </p>
            </div>
          )}
        </div>

        {/* Onboarding Status */}
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold">Onboarding Progress</h2>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((phaseNum) => {
              const phaseKey = `phase${phaseNum}`;
              const status = profile.onboardingProgress?.phases?.[phaseKey]?.status || 'pending';
              const isCompleted = status === 'completed';
              const isCurrent = status === 'in_progress';
              
              return (
                <div key={phaseNum} className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${isCompleted ? 'bg-green-100 text-green-800' : 
                      isCurrent ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-400' : 
                      'bg-gray-100 text-gray-400'}
                  `}>
                    {phaseNum}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      Phase {phaseNum}
                    </div>
                    <div className="text-xs text-gray-500">
                      {status === 'completed' ? 'Completed' : 
                       status === 'in_progress' ? 'In Progress' : 
                       status === 'blocked' ? 'Blocked' :
                       'Not Started'}
                    </div>
                  </div>
                  <div className={`
                    px-2 py-1 rounded text-xs font-medium
                    ${status === 'completed' ? 'bg-green-100 text-green-800' : 
                      status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                      status === 'blocked' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-500'}
                  `}>
                    {status === 'completed' ? '✓ Done' : 
                     status === 'in_progress' ? 'Active' : 
                     status === 'blocked' ? 'Blocked' :
                     'Pending'}
                  </div>
                </div>
              );
            })}
            
            <button
              onClick={() => window.location.href = '/reporchestrator'}
              className="w-full mt-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <span>Continue Onboarding</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Overall Score Card - Using REPS score if available */}
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold">Overall Score</h2>
          </div>
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-blue-600">
              {overallScore}
            </div>
            <div className="text-sm text-gray-500">out of 100</div>
          </div>
          <div className="space-y-3">
            {profile.skills?.contactCenter?.[0]?.assessmentResults?.keyMetrics && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Professionalism</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${profile.skills.contactCenter[0].assessmentResults.keyMetrics.professionalism || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {profile.skills.contactCenter[0].assessmentResults.keyMetrics.professionalism || 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Effectiveness</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${profile.skills.contactCenter[0].assessmentResults.keyMetrics.effectiveness || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {profile.skills.contactCenter[0].assessmentResults.keyMetrics.effectiveness || 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Customer Focus</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${profile.skills.contactCenter[0].assessmentResults.keyMetrics.customerFocus || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {profile.skills.contactCenter[0].assessmentResults.keyMetrics.customerFocus || 0}
                    </span>
                  </div>
                </div>
              </>
            )}
            {!profile.skills?.contactCenter?.[0]?.assessmentResults?.keyMetrics && (
              <div className="text-center py-2 text-gray-500">
                No assessment metrics available
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 text-right mt-2">
            Last updated: {lastUpdated}
          </div>
        </div>

        {/* Availability Section */}
        <div className="bg-white rounded-lg p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold">Working Hours & Availability</h2>
            </div>
            {(timezoneData || profile.availability?.timeZone) && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Time Zone</h3>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    {timezoneData 
                      ? repWizardApi.formatTimezone(timezoneData)
                      : typeof profile.availability.timeZone === 'string'
                        ? profile.availability.timeZone
                        : typeof profile.availability.timeZone === 'object' && profile.availability.timeZone
                          ? `${profile.availability.timeZone.countryName} - ${profile.availability.timeZone.zoneName} (GMT${profile.availability.timeZone.gmtOffset >= 0 ? '+' : ''}${profile.availability.timeZone.gmtOffset})`
                          : 'Not specified'
                    }
                  </span>
                </div>
                
                {/* Timezone mismatch warning */}
                {(() => {
                  const mismatchInfo = getTimezoneMismatchInfo();
                  if (mismatchInfo) {
                    return (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
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
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            {/* Schedule Display */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Working Schedule</h4>
              <div className="space-y-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const daySchedule = profile.availability?.schedule?.find((s: ScheduleDay) => s.day === day);
                  return (
                    <div 
                      key={day}
                      className={`flex items-center justify-between p-3 rounded ${
                        daySchedule ? 'bg-blue-50 text-blue-900' : 'bg-gray-50 text-gray-500'
                      }`}
                    >
                      <span className="font-medium">{day}</span>
                      {daySchedule ? (
                        <span className="text-blue-700">
                          {daySchedule.hours.start} - {daySchedule.hours.end}
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">Not available</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Flexibility Options */}
            {profile.availability?.flexibility && profile.availability.flexibility.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Schedule Flexibility</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.availability.flexibility.map((option: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium"
                    >
                      {option}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="md:col-span-8 space-y-6">
        {/* About Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">About</h2>
          {profile.professionalSummary?.profileDescription ? (
            <p className="text-gray-700 whitespace-pre-wrap">{profile.professionalSummary.profileDescription}</p>
          ) : (
            <p className="text-gray-500 italic">No profile description available</p>
          )}
        </div>

        {/* Years of Experience Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Years of Experience</h2>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-gray-500" />
            <span className="text-lg text-gray-800">
              {profile.professionalSummary?.yearsOfExperience ? (
                `${profile.professionalSummary.yearsOfExperience} years`
              ) : (
                <span className="text-gray-500 italic">Not specified</span>
              )}
            </span>
          </div>
        </div>

        {/* Industries Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Industries</h2>
          {profile.professionalSummary?.industries?.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {profile.professionalSummary.industries.map((industry: string, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                  {industry}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No industries listed</p>
          )}
        </div>

        {/* Notable Companies Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Notable Companies</h2>
          {profile.professionalSummary?.notableCompanies?.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {profile.professionalSummary.notableCompanies.map((company: string, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm">
                  {company}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No notable companies listed</p>
          )}
        </div>

        {/* Technical Skills Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Technical Skills</h2>
          {(!profile.skills?.technical || profile.skills.technical.length === 0) && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Technical skills are required. Please add your technical expertise.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {formatSkillsForDisplay(profile.skills?.technical).map((skill: any, idx: number) => (
              <div key={idx} className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                <span className="font-medium">{skill.name}</span>
              </div>
            ))}
          </div>
          {formatSkillsForDisplay(profile.skills?.technical).length === 0 && (
            <p className="text-gray-500 italic">No technical skills listed</p>
          )}
        </div>
        
        {/* Professional Skills Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Professional Skills</h2>
          {(!profile.skills?.professional || profile.skills.professional.length === 0) && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Professional skills are required. Please add your professional expertise.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {formatSkillsForDisplay(profile.skills?.professional).map((skill: any, idx: number) => (
              <div key={idx} className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                <span className="font-medium">{skill.name}</span>
              </div>
            ))}
          </div>
          {formatSkillsForDisplay(profile.skills?.professional).length === 0 && (
            <p className="text-gray-500 italic">No professional skills listed</p>
          )}
        </div>
        
        {/* Soft Skills Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Soft Skills</h2>
          {(!profile.skills?.soft || profile.skills.soft.length === 0) && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Soft skills are required. Please add your interpersonal skills.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {formatSkillsForDisplay(profile.skills?.soft).map((skill: any, idx: number) => (
              <div key={idx} className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                <span className="font-medium">{skill.name}</span>
              </div>
            ))}
          </div>
          {formatSkillsForDisplay(profile.skills?.soft).length === 0 && (
            <p className="text-gray-500 italic">No soft skills listed</p>
          )}
        </div>
        
        {/* Contact Center Skills Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">Contact Center Skills</h2>
          {(!profile.skills?.contactCenter || !profile.skills.contactCenter.some((skill: ContactCenterSkill) => skill.assessmentResults)) && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              You should be assessed in at least one contact center skill.
            </div>
          )}
          <div className="space-y-8">
            {CONTACT_CENTER_SKILLS.map((category) => (
              <div key={category.name} className="mb-8">
                <h3 className="text-xl font-medium text-gray-800 mb-4 pb-2 border-b">{category.name}</h3>
                <div className="space-y-4">
                  {category.skills.map((skillName) => {
                    const skillData = findSkillData(skillName);
                    
                    return (
                      <div key={skillName} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-gray-800">{skillName}</h4>
                          {skillData ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {skillData.proficiency}
                              </span>
                              {skillData.assessmentResults?.score !== undefined && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                                  Score: {skillData.assessmentResults.score}/100
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs italic">
                              Not assessed yet
                            </span>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          {skillData?.assessmentResults ? (
                            <div className="mt-3">
                              {/* Display key metrics if available */}
                              {skillData.assessmentResults.keyMetrics && (
                                <div className="grid grid-cols-3 gap-2">
                                  {skillData.assessmentResults.keyMetrics.professionalism !== undefined && (
                                    <div className="bg-blue-50 p-2 rounded text-center">
                                      <div className="text-xs text-gray-600 mb-1">Professionalism</div>
                                      <div className="text-sm font-semibold">{skillData.assessmentResults.keyMetrics.professionalism}/100</div>
                                    </div>
                                  )}
                                  {skillData.assessmentResults.keyMetrics.effectiveness !== undefined && (
                                    <div className="bg-green-50 p-2 rounded text-center">
                                      <div className="text-xs text-gray-600 mb-1">Effectiveness</div>
                                      <div className="text-sm font-semibold">{skillData.assessmentResults.keyMetrics.effectiveness}/100</div>
                                    </div>
                                  )}
                                  {skillData.assessmentResults.keyMetrics.customerFocus !== undefined && (
                                    <div className="bg-purple-50 p-2 rounded text-center">
                                      <div className="text-xs text-gray-600 mb-1">Customer Focus</div>
                                      <div className="text-sm font-semibold">{skillData.assessmentResults.keyMetrics.customerFocus}/100</div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 text-sm text-gray-500 italic">
                              Complete an assessment to see your KPI metrics
                            </div>
                          )}
                          
                          <button 
                            onClick={() => takeContactCenterSkillAssessment(skillName)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          >
                            {skillData?.assessmentResults ? 'Retake Assessment' : 'Take Assessment'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Languages Section - Moved from left column */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">Languages</h2>
          {(!profile.personalInfo?.languages || profile.personalInfo.languages.length === 0) ? (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              You should specify at least one language.
            </div>
          ) : !profile.personalInfo.languages.some((lang: Language) => lang.assessmentResults) && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              You should be assessed in at least one language.
            </div>
          )}
          {profile.personalInfo?.languages?.length > 0 ? (
            <div className="space-y-4">
              {profile.personalInfo.languages.map((lang: any, index: number) => {
                const stars = getProficiencyStars(lang.proficiency);
                
                return (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-gray-800">{lang.language}</h3>
                      <div className="flex items-center">
                        {[...Array(6)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < stars
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="mb-4 flex justify-between items-center">
                      <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {lang.proficiency}
                      </span>
                      <button 
                        onClick={() => takeLanguageAssessment(lang.language, lang.iso639_1)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                      >
                        {lang.assessmentResults ? 'Retake Assessment' : 'Take Assessment'}
                      </button>
                    </div>
                    
                    {/* Always show assessment criteria */}
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {!lang.assessmentResults ? (
                        <div className="col-span-3 text-center">
                          <p className="text-sm text-gray-500 italic">Not assessed yet</p>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span className="text-sm text-gray-600">Fluency</span>
                            <p className="font-medium text-gray-800">{lang.assessmentResults.fluency?.score || 0}/100</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Proficiency</span>
                            <p className="font-medium text-gray-800">{lang.assessmentResults.proficiency?.score || 0}/100</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Completeness</span>
                            <p className="font-medium text-gray-800">{lang.assessmentResults.completeness?.score || 0}/100</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 italic">No languages listed</p>
          )}
        </div>

        {/* Experience Section - Always show this section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">Experience</h2>
          {(!profile.experience || profile.experience.length === 0) && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Please add your work experience.
            </div>
          )}
          {profile.experience?.length > 0 ? (
            <div className="space-y-6">
              {profile.experience.map((exp: any, index: number) => {
                // Format dates for display
                const formatDateToDD_MM_YYYY = (dateString: string) => {
                  if (!dateString) return '';
                  // Check if it's already formatted with slashes or dashes
                  if (dateString.includes('/') || dateString.includes('-')) {
                    // Try to standardize the format
                    try {
                      const date = new Date(dateString);
                      return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
                    } catch (e) {
                      return dateString; // Return as is if parsing fails
                    }
                  }
                  
                  // Parse ISO date
                  try {
                    const date = new Date(dateString);
                    return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
                  } catch (e) {
                    return dateString;
                  }
                };
                
                const startDate = formatDateToDD_MM_YYYY(exp.startDate);
                // Handle endDate specifically - could be 'present' or a Date
                let endDate = exp.endDate === 'present' ? 'Present' : 
                              exp.endDate ? formatDateToDD_MM_YYYY(exp.endDate) : 'Present';
                
                return (
                  <div key={index} className="border-l-2 border-blue-500 pl-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-gray-800">{exp.title || exp.role || 'Position'}</h3>
                        <p className="text-gray-600">{exp.company || 'Company'}</p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {startDate} - {endDate}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-gray-700 mt-2">{exp.description}</p>
                    )}
                    
                    {/* Responsibilities section */}
                    {exp.responsibilities?.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Responsibilities:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {exp.responsibilities.map((responsibility: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-600">{responsibility}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Achievements section */}
                    {exp.achievements?.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Key Achievements:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {exp.achievements.map((achievement: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-600">{achievement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 italic">No experience listed</p>
          )}
        </div>
      </div>

      {/* Updated Image Modal */}
      {showImageModal && profile.personalInfo?.photo?.url && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
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
              onClick={() => setShowImageModal(false)}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Main image */}
            <div className="p-4">
              <img
                src={profile.personalInfo.photo.url}
                alt={profile.personalInfo?.name || 'Profile'}
                className="w-full h-auto object-contain rounded-lg"
                style={{ maxHeight: '70vh' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 