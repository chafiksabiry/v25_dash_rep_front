import React, { useEffect, useState } from 'react';
import {
  MapPin, Mail, Phone, Target, Clock, Briefcase,
  Calendar, Edit, CreditCard, X, RefreshCw, CheckCircle, User, Building2, Layers,
  AlertCircle, Zap, Award, Globe, ChevronRight
} from 'lucide-react';
import { getProfilePlan, checkCountryMismatch, updateProfileData } from '../utils/profileUtils';
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
  switch (proficiency) {
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

export const ProfileView: React.FC<{ profile: any, onEditClick: () => void, onProfileUpdate?: (updatedProfile: any) => void }> = ({ profile, onEditClick, onProfileUpdate }) => {
  const [isPublishing, setIsPublishing] = useState(false);
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
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);

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

        // Only show spinner if check takes longer than 800ms
        const spinnerTimer = setTimeout(() => {
          setShowLoadingSpinner(true);
        }, 800);

        console.log('🔍 Checking country mismatch for selected country:', countryData.countryCode);

        const mismatchResult = await checkCountryMismatch(
          countryData.countryCode,
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
    // Check if we're in standalone mode
    const isStandaloneMode = import.meta.env.VITE_RUN_MODE === 'standalone';
    // Use the appropriate assessment app URL based on the mode
    const assessmentAppUrl = isStandaloneMode
      ? import.meta.env.VITE_ASSESSMENT_APP_STANDALONE
      : import.meta.env.VITE_ASSESSMENT_APP;

    //const assessmentUrl = `${assessmentAppUrl}/language/${langParameter}`;
    const assessmentUrl = `${assessmentAppUrl}/language?lang=${language}&code=${iso639_1Code}`;

    console.log("assessmentUrl language", assessmentUrl);
    window.location.href = assessmentUrl;
  };

  // Format skill name for URL (e.g., "Active Listening" -> "active-listening")
  const formatSkillForUrl = (skillName: string): string => {
    return skillName.toLowerCase().replace(/\s+/g, '-');
  };

  // Function to take a contact center skill assessment
  const takeContactCenterSkillAssessment = (skillName: string, categoryName?: string) => {
    const formattedSkill = formatSkillForUrl(skillName);

    // Check if we're in standalone mode
    const isStandaloneMode = import.meta.env.VITE_RUN_MODE === 'standalone';
    // Use the appropriate assessment app URL based on the mode
    const assessmentAppUrl = isStandaloneMode
      ? import.meta.env.VITE_ASSESSMENT_APP_STANDALONE
      : import.meta.env.VITE_ASSESSMENT_APP;

    let assessmentUrl = `${assessmentAppUrl}/contact-center/${formattedSkill}`;
    if (categoryName) {
      assessmentUrl += `?cat=${encodeURIComponent(categoryName)}`;
    }

    console.log("assessmentUrl contact center", assessmentUrl);
    window.location.href = assessmentUrl;
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

  // Function to publish the profile
  const handlePublish = async () => {
    if (!profile?._id) return;

    try {
      setIsPublishing(true);
      console.log('🚀 Publishing profile...', profile._id);

      const updatedData = await updateProfileData(profile._id, { status: 'completed' });
      console.log('✅ Profile published successfully:', updatedData);

      if (onProfileUpdate) {
        onProfileUpdate(updatedData);
      }

      // Update local storage directly to reflect change immediately
      const storedProfile = localStorage.getItem('profileData');
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        parsed.status = 'completed';
        localStorage.setItem('profileData', JSON.stringify(parsed));
      }
    } catch (error) {
      console.error('❌ Error publishing profile:', error);
      alert('Failed to publish profile. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-2">
        <div className="relative">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase leading-none">Profile Information</h1>
          <div className="absolute -bottom-2 left-0 w-12 h-1 bg-harx-pink rounded-full"></div>
        </div>
        
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          {profile.status !== 'completed' && (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-green-500 text-white hover:bg-green-600 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 active:scale-95"
            >
              {isPublishing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isPublishing ? 'Publishing...' : 'Publish Profile'}
            </button>
          )}
          <button
            onClick={onEditClick}
            className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-harx-pink text-white hover:bg-harx-pink-dark flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

      {/* Left Column */}
      <div className="md:col-span-4 space-y-6">
        {/* Profile Header (Avatar Section) */}
        <div className="harx-card p-8 bg-white text-center overflow-hidden relative group">
          <div className="relative mb-8">
            <div className="w-40 h-40 rounded-full mx-auto p-1 bg-gradient-to-tr from-harx-pink to-slate-200 shadow-2xl relative z-10 overflow-hidden">
              <div 
                className="w-full h-full rounded-full bg-slate-50 overflow-hidden flex items-center justify-center cursor-pointer group/photo"
                onClick={() => profile.personalInfo?.photo?.url && setShowImageModal(true)}
              >
                {profile.personalInfo?.photo?.url ? (
                  <>
                    <img
                      src={profile.personalInfo.photo.url}
                      alt={profile.personalInfo?.name || 'Profile'}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-black uppercase tracking-widest">Enlarge</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-300">
                    {profile.personalInfo?.name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
            </div>
            {/* Decorative element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-harx-pink/5 rounded-full blur-3xl -z-0"></div>
          </div>

          <h1 className="text-3xl font-black text-slate-800 mb-1 tracking-tight">{profile.personalInfo?.name}</h1>
          <p className="text-sm font-black text-harx-pink uppercase tracking-[0.2em] mb-6">{profile.professionalSummary?.currentRole || 'Representative'}</p>
          
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100/50">
              <MapPin className="w-4 h-4 text-harx-pink" />
              <span className="text-sm font-bold text-slate-600">{countryData?.countryName || 'Country not specified'}</span>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-50">
              {profile.personalInfo?.email && (
                <a href={`mailto:${profile.personalInfo.email}`} className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-harx-pink transition-all hover:shadow-md hover:-translate-y-1">
                  <Mail className="w-5 h-5" />
                </a>
              )}
              {profile.personalInfo?.phone && (
                <a href={`tel:${profile.personalInfo.phone}`} className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-harx-pink transition-all hover:shadow-md hover:-translate-y-1">
                  <Phone className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Location Warnings & Status Icons */}
        {(countryMismatch?.hasMismatch || (checkingCountryMismatch && showLoadingSpinner)) && (
          <div className="space-y-3">
            {countryMismatch?.hasMismatch && (
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl animate-in slide-in-from-top-2 duration-500">
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-orange-800 uppercase tracking-widest mb-1">Security Alert</p>
                    <p className="text-xs font-bold text-orange-700 leading-relaxed">
                      Profile country (<strong>{countryMismatch.selectedCountry}</strong>) differs from initial login (<strong>{countryMismatch.firstLoginCountry}</strong>).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {checkingCountryMismatch && showLoadingSpinner && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-harx-pink animate-spin" />
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Validating Location...</p>
              </div>
            )}
          </div>
        )}

        {/* Subscription Plan Card */}
        <div className="harx-card p-8 bg-white">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
            <div className="p-2 bg-slate-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-harx-pink" />
            </div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Membership</h2>
          </div>
          
          {planError ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">{planError}</div>
          ) : planData && Object.keys(planData.plan).length > 0 ? (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-harx-pink/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700"></div>
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                    {planData.plan.name}
                  </h3>
                  <span className="px-3 py-1 bg-harx-pink text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                    Active
                  </span>
                </div>
                
                <div className="flex items-baseline gap-1 mb-6 relative z-10">
                  <span className="text-4xl font-black text-slate-800">${planData.plan.price}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">/month</span>
                </div>
                
                <div className="space-y-2 border-t border-slate-200/50 pt-4 relative z-10">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Account Type</span>
                    <span className="text-slate-800">{planData.plan.targetUserType}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Joined</span>
                    <span className="text-slate-800">{planData.plan.createdAt ? new Date(planData.plan.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 px-6 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <CreditCard className="w-8 h-8 text-slate-200" />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Plan Not Configured</h3>
              <p className="text-xs font-bold text-slate-400 leading-relaxed mb-6">
                Complete your payment setup to unlock premium features.
              </p>
              <button className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all">
                Select a Plan
              </button>
            </div>
          )}
        </div>

        {/* Onboarding Status */}
        <div className="harx-card p-8 bg-white">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50">
            <div className="p-2 bg-slate-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-harx-pink" />
            </div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Onboarding</h2>
          </div>
          
          <div className="space-y-6">
            {[1, 2, 3, 4].map((phaseNum) => {
              const phaseKey = `phase${phaseNum}`;
              const status = profile.onboardingProgress?.phases?.[phaseKey]?.status || 'pending';
              const isCompleted = status === 'completed';
              const isCurrent = status === 'in_progress';

              return (
                <div key={phaseNum} className="flex items-center gap-4 group">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-300 shadow-sm
                    ${isCompleted ? 'bg-green-500 text-white shadow-green-100' :
                      isCurrent ? 'bg-harx-pink text-white shadow-pink-100 scale-110' :
                        'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}
                  `}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : phaseNum}
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">
                      Phase {phaseNum}
                    </div>
                    <div className="text-sm font-bold text-slate-700">
                      {status === 'completed' ? 'Fully Certified' :
                        status === 'in_progress' ? 'Active Certification' :
                          status === 'blocked' ? 'Pending Review' :
                            'Not Initiated'}
                    </div>
                  </div>
                  <div className={`
                    px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border
                    ${status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' :
                      status === 'in_progress' ? 'bg-harx-pink/10 text-harx-pink border-harx-pink/20' :
                        status === 'blocked' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-slate-50 text-slate-400 border-slate-100'}
                  `}>
                    {status === 'completed' ? 'Done' :
                      status === 'in_progress' ? 'Active' :
                        status === 'blocked' ? 'Wait' :
                          'Idle'}
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => window.location.href = '/reporchestrator'}
              className="w-full mt-4 py-4 bg-slate-800 text-white rounded-2xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-1 group active:scale-95"
            >
              <span className="text-xs font-black uppercase tracking-[0.2em]">Launch Training Space</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Overall Score Card */}
        <div className="harx-card p-8 bg-white relative overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-harx-pink/5 rounded-full blur-3xl"></div>
          
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50 relative z-10">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Target className="w-5 h-5 text-harx-pink" />
            </div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Performance</h2>
          </div>

          <div className="flex flex-col items-center mb-10 relative z-10">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-100"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={364.4}
                  strokeDashoffset={364.4 - (364.4 * (typeof overallScore === 'number' ? overallScore : 0)) / 100}
                  className="text-harx-pink transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{overallScore}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Global</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            {[
              { label: 'Professionalism', key: 'professionalism', color: 'bg-blue-500' },
              { label: 'Effectiveness', key: 'effectiveness', color: 'bg-green-500' },
              { label: 'Customer Focus', key: 'customerFocus', color: 'bg-purple-500' }
            ].map((metric) => {
              const value = profile.skills?.contactCenter?.[0]?.assessmentResults?.keyMetrics?.[metric.key] || 0;
              return (
                <div key={metric.key} className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{metric.label}</span>
                    <span className="text-[10px] font-black text-slate-800">{value}%</span>
                  </div>
                  <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                    <div 
                      className={`h-full ${metric.color} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${value}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-8 pt-4 border-t border-slate-50 text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Last Analysis: <span className="text-slate-600">{lastUpdated}</span>
            </p>
          </div>
        </div>

        {/* Availability Section */}
        <div className="harx-card p-8 bg-white">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Clock className="w-5 h-5 text-harx-pink" />
            </div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Availability</h2>
          </div>
          
          {(timezoneData || profile.availability?.timeZone) && (
            <div className="mb-8">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Time Zone</h3>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                <Globe className="w-4 h-4 text-harx-pink" />
                <span className="text-sm font-bold text-slate-700">
                  {timezoneData
                    ? repWizardApi.formatTimezone(timezoneData)
                    : typeof profile.availability.timeZone === 'string'
                      ? profile.availability.timeZone
                      : typeof profile.availability.timeZone === 'object' && profile.availability.timeZone
                        ? `${profile.availability.timeZone.countryName} - ${profile.availability.timeZone.zoneName} (GMT${profile.availability.timeZone.gmtOffset >= 0 ? '+' : ''}${Math.floor(profile.availability.timeZone.gmtOffset)})`
                        : 'Not specified'
                  }
                </span>
              </div>

              {/* Timezone mismatch warning */}
              {(() => {
                const mismatchInfo = getTimezoneMismatchInfo();
                if (mismatchInfo) {
                  return (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                      <div className="mt-0.5">
                        <svg className="h-4 w-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-[10px] font-bold text-amber-800 leading-relaxed">
                        TimeZone belongs to <strong>{mismatchInfo.timezoneCountry}</strong>, but your country is <strong>{mismatchInfo.selectedCountry}</strong>.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          <div className="space-y-6">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Operations Schedule</h4>
            <div className="grid grid-cols-1 gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                const daySchedule = profile.availability?.schedule?.find((s: ScheduleDay) => s.day === day);
                return (
                  <div
                    key={day}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${daySchedule ? 'bg-slate-50 border border-slate-100/50' : 'opacity-40'
                      }`}
                  >
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">{day.substring(0, 3)}</span>
                    {daySchedule ? (
                      <span className="text-[11px] font-black text-harx-pink tracking-wider">
                        {daySchedule.hours.start} — {daySchedule.hours.end}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300 uppercase italic">Offline</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Flexibility Options */}
            {profile.availability?.flexibility && profile.availability.flexibility.length > 0 && (
              <div className="pt-4 mt-6 border-t border-slate-50">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Flexibility</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.availability.flexibility.map((option: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-100"
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
        <div className="harx-card p-8 bg-white">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50">
            <div className="p-2 bg-slate-50 rounded-lg">
              <User className="w-5 h-5 text-harx-pink" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">About</h2>
          </div>

          {/* Profile Description */}
          <div className="mb-10">
            {profile.professionalSummary?.profileDescription ? (
              <p className="text-slate-600 font-bold leading-relaxed whitespace-pre-wrap">{profile.professionalSummary.profileDescription}</p>
            ) : (
              <p className="text-slate-400 font-bold italic">No profile description available</p>
            )}
          </div>

          {/* Introduction Video Section */}
          <div className="pt-8 border-t border-slate-50">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Introduction Video</h3>

            {profile.personalInfo?.presentationVideo && profile.personalInfo.presentationVideo.url ? (
              <div className="space-y-6">
                {/* Video Player - Responsive with proper aspect ratio */}
                <div className="w-full relative group overflow-hidden rounded-3xl border border-slate-100 shadow-xl">
                  <video
                    controls
                    className="w-full aspect-video bg-slate-900 object-cover"
                  >
                    <source src={profile.personalInfo.presentationVideo.url} type="video/mp4" />
                    <source src={profile.personalInfo.presentationVideo.url} type="video/webm" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* Video Information */}
                <div className="flex flex-wrap gap-4">
                  {profile.personalInfo.presentationVideo.duration && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100/50">
                      <Clock className="w-3.5 h-3.5 text-harx-pink" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Duration: {Math.floor(profile.personalInfo.presentationVideo.duration)}s
                      </span>
                    </div>
                  )}
                  {profile.personalInfo.presentationVideo.recordedAt && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100/50">
                      <Calendar className="w-3.5 h-3.5 text-harx-pink" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Recorded: {new Date(profile.personalInfo.presentationVideo.recordedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                <div className="mt-0.5">
                  <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-1">Upload Required</p>
                  <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                    Presentation video is missing. A video introduction is required to verify your profile.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Professional Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Years of Experience Card */}
          <div className="harx-card p-8 bg-white flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-50 rounded-lg">
                <Briefcase className="w-5 h-5 text-harx-pink" />
              </div>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Experience Range</h2>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-800 tracking-tighter">
                {profile.professionalSummary?.yearsOfExperience || '0'}
              </span>
              <span className="text-sm font-black text-harx-pink uppercase tracking-widest">Years Total</span>
            </div>
          </div>

          {/* Notable Companies Card */}
          <div className="harx-card p-8 bg-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-50 rounded-lg">
                <Building2 className="w-5 h-5 text-harx-pink" />
              </div>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Notable Brands</h2>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {profile.professionalSummary?.notableCompanies?.length > 0 ? (
                profile.professionalSummary.notableCompanies.map((company: string, idx: number) => (
                  <span key={idx} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    {company}
                  </span>
                ))
              ) : (
                <p className="text-[11px] font-bold text-slate-400 italic">No notable brands listed</p>
              )}
            </div>
          </div>
        </div>

        {/* Sectors & Domains Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Industries Card */}
          <div className="harx-card p-8 bg-white">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
              <div className="p-2 bg-slate-50 rounded-lg">
                <Layers className="w-5 h-5 text-harx-pink" />
              </div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Industries</h2>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {profile.professionalSummary?.industries?.length > 0 ? (
                profile.professionalSummary.industries.map((industry: any, idx: number) => (
                  <span key={idx} className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                    {typeof industry === 'string' ? industry : industry.name || industry._id}
                  </span>
                ))
              ) : (
                <p className="text-[11px] font-bold text-slate-400 italic">No industries specified</p>
              )}
            </div>
            
            {(!profile.professionalSummary?.industries || profile.professionalSummary.industries.length === 0) && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest leading-relaxed">Required Field</p>
              </div>
            )}
          </div>

          {/* Activities Card */}
          <div className="harx-card p-8 bg-white">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
              <div className="p-2 bg-slate-50 rounded-lg">
                <Zap className="w-5 h-5 text-harx-pink" />
              </div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Activities</h2>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {profile.professionalSummary?.activities?.length > 0 ? (
                profile.professionalSummary.activities.map((activity: any, idx: number) => (
                  <span key={idx} className="px-3 py-1.5 bg-harx-pink text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-pink-100 transition-all">
                    {typeof activity === 'string' ? activity : activity.name || activity._id}
                  </span>
                ))
              ) : (
                <p className="text-[11px] font-bold text-slate-400 italic">No activities specified</p>
              )}
            </div>

            {(!profile.professionalSummary?.activities || profile.professionalSummary.activities.length === 0) && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest leading-relaxed">Required Field</p>
              </div>
            )}
          </div>
        </div>
             {/* Skills & Expertise Section */}
        <div className="harx-card p-8 bg-white">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Zap className="w-5 h-5 text-harx-pink" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Expertise</h2>
          </div>

          <div className="space-y-10">
            {/* Technical Skills */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Technical Stack</h3>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{formatSkillsForDisplay(profile.skills?.technical).length} Skills</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {formatSkillsForDisplay(profile.skills?.technical).length > 0 ? (
                  formatSkillsForDisplay(profile.skills?.technical).map((skill: any, idx: number) => (
                    <span key={idx} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-700 uppercase tracking-widest hover:border-harx-pink/30 hover:bg-white transition-all">
                      {skill.name}
                    </span>
                  ))
                ) : (
                  <p className="text-[11px] font-bold text-slate-400 italic">No technical skills listed</p>
                )}
              </div>
            </div>

            {/* Professional Skills */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Professional Competencies</h3>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{formatSkillsForDisplay(profile.skills?.professional).length} Skills</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {formatSkillsForDisplay(profile.skills?.professional).length > 0 ? (
                  formatSkillsForDisplay(profile.skills?.professional).map((skill: any, idx: number) => (
                    <span key={idx} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-700 uppercase tracking-widest hover:border-harx-pink/30 hover:bg-white transition-all">
                      {skill.name}
                    </span>
                  ))
                ) : (
                  <p className="text-[11px] font-bold text-slate-400 italic">No professional skills listed</p>
                )}
              </div>
            </div>

            {/* Soft Skills */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Communication & Soft Skills</h3>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{formatSkillsForDisplay(profile.skills?.soft).length} Skills</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {formatSkillsForDisplay(profile.skills?.soft).length > 0 ? (
                  formatSkillsForDisplay(profile.skills?.soft).map((skill: any, idx: number) => (
                    <span key={idx} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-700 uppercase tracking-widest hover:border-harx-pink/30 hover:bg-white transition-all">
                      {skill.name}
                    </span>
                  ))
                ) : (
                  <p className="text-[11px] font-bold text-slate-400 italic">No soft skills listed</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Center Certifications */}
        <div className="harx-card p-8 bg-white">
          <div className="flex items-center gap-3 mb-10 pb-4 border-b border-slate-50">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Award className="w-5 h-5 text-harx-pink" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Certifications</h2>
          </div>

          <div className="space-y-8">
            {[
              ...CONTACT_CENTER_SKILLS,
              {
                name: "Operational Sectors",
                skills: (profile.professionalSummary?.activities || []).map((a: any) => typeof a === 'string' ? a : a.name)
              }
            ].filter(category => category.skills.length > 0).map((category) => (
              <div key={category.name} className="group/cat">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                  {category.name}
                  <div className="h-px flex-1 bg-slate-50"></div>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.skills.map((skillName: string) => {
                    const skillData = findSkillData(skillName);
                    const hasAssessment = !!skillData?.assessmentResults;

                    return (
                      <div key={skillName} className={`
                        p-5 rounded-2xl transition-all duration-300 border
                        ${hasAssessment ? 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-xl hover:-translate-y-1' : 'bg-white border-slate-50 opacity-60'}
                      `}>
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">{skillName}</h4>
                          {hasAssessment && (
                            <div className="px-2 py-1 bg-green-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">
                              Verified
                            </div>
                          )}
                        </div>

                        {hasAssessment ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
                                <p className="text-xl font-black text-slate-800 leading-none">{skillData.assessmentResults.score}%</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Level</p>
                                <p className="text-[10px] font-black text-harx-pink uppercase tracking-widest">{skillData.proficiency}</p>
                              </div>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-harx-pink rounded-full" style={{ width: `${skillData.assessmentResults.score}%` }}></div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => takeContactCenterSkillAssessment(skillName, category.name)}
                            className="w-full py-3 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:bg-harx-pink hover:text-white hover:border-harx-pink transition-all"
                          >
                            Take Assessment
                          </button>
                        )}
                        
                        {hasAssessment && (
                          <button
                            onClick={() => takeContactCenterSkillAssessment(skillName, category.name)}
                            className="w-full mt-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-harx-pink transition-all flex items-center justify-center gap-2 group/btn"
                          >
                            <RefreshCw className="w-3 h-3 group-hover/btn:animate-spin" />
                            Retake Analysis
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Languages Section */}
        <div className="harx-card p-8 bg-white">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Globe className="w-5 h-5 text-harx-pink" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Languages</h2>
          </div>

          <div className="space-y-6">
            {(!profile.personalInfo?.languages || profile.personalInfo.languages.length === 0) ? (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">At least one language is required</p>
              </div>
            ) : (
              profile.personalInfo.languages.map((lang: any, index: number) => {
                const stars = getProficiencyStars(lang.proficiency);
                const languageName = typeof lang.language === 'object' && lang.language
                  ? lang.language.name
                  : (typeof lang.language === 'string' ? lang.language : 'Unknown Language');
                const languageCode = typeof lang.language === 'object' && lang.language ? lang.language.code : '';

                return (
                  <div key={index} className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100 uppercase">
                          {languageCode || '??'}
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">
                          {languageName}
                        </h3>
                      </div>
                      <div className="flex gap-1">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${i < stars ? 'bg-harx-pink' : 'bg-slate-200'}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-3 bg-white rounded-xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Fluency</p>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-widest">{lang.proficiency}</p>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${lang.assessmentResults ? 'text-green-500' : 'text-slate-300'}`}>
                          {lang.assessmentResults ? 'Verified' : 'Pending'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => takeLanguageAssessment(languageName, languageCode)}
                      className="w-full py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:bg-harx-pink group-hover:text-white group-hover:border-harx-pink transition-all"
                    >
                      {lang.assessmentResults ? 'Retake Analysis' : 'Verify Proficiency'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Experience Section */}
        <div className="harx-card p-8 bg-white">
          <div className="flex items-center gap-3 mb-10 pb-4 border-b border-slate-50">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Briefcase className="w-5 h-5 text-harx-pink" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Work History</h2>
          </div>

          <div className="space-y-12">
            {profile.experience?.length > 0 ? (
              profile.experience.map((exp: any, index: number) => {
                const formatDate = (dateString: string) => {
                  if (!dateString) return '';
                  try {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
                  } catch (e) {
                    return dateString.toUpperCase();
                  }
                };

                const start = formatDate(exp.startDate);
                const end = exp.endDate === 'present' || !exp.endDate ? 'PRESENT' : formatDate(exp.endDate);

                return (
                  <div key={index} className="relative pl-8 before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-0 before:w-px before:bg-slate-100 group">
                    <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-slate-200 border-2 border-white transition-all group-hover:bg-harx-pink group-hover:scale-125"></div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">{exp.title || exp.role || 'Professional'}</h3>
                        <p className="text-[11px] font-black text-harx-pink uppercase tracking-widest">{exp.company || 'Unknown Enterprise'}</p>
                      </div>
                      <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{start} — {end}</p>
                      </div>
                    </div>

                    {exp.description && (
                      <p className="text-[11px] font-bold text-slate-500 leading-relaxed mb-6">{exp.description}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {exp.responsibilities?.length > 0 && (
                        <div>
                          <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Core Responsibilities</h4>
                          <ul className="space-y-3">
                            {exp.responsibilities.map((r: string, idx: number) => (
                              <li key={idx} className="flex gap-3 text-[10px] font-bold text-slate-600">
                                <div className="mt-1.5 w-1 h-1 rounded-full bg-slate-200 shrink-0"></div>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {exp.achievements?.length > 0 && (
                        <div>
                          <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Key Achievements</h4>
                          <ul className="space-y-3">
                            {exp.achievements.map((a: string, idx: number) => (
                              <li key={idx} className="flex gap-3 text-[10px] font-black text-harx-pink bg-pink-50/30 p-2 rounded-lg border border-pink-100/20">
                                <Target className="w-3 h-3 shrink-0 mt-0.5" />
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-[11px] font-bold text-slate-400 italic">No work history documented</p>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Updated Image Modal */}
    {showImageModal && profile?.personalInfo?.photo?.url && (
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4"
        onClick={() => setShowImageModal(false)}
      >
        <div
          className="relative w-[30%] min-w-[300px] bg-white rounded-[40px] overflow-hidden flex flex-col shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-300"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Profile Identity</h3>
            <button
              className="p-2 hover:bg-slate-50 rounded-full transition-colors"
              onClick={() => setShowImageModal(false)}
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Main image */}
          <div className="p-8">
            <div className="relative group rounded-[32px] overflow-hidden shadow-xl border border-slate-100">
              <img
                src={profile.personalInfo.photo.url}
                alt={profile.personalInfo?.name || 'Profile'}
                className="w-full h-auto object-contain"
                style={{ maxHeight: '60vh' }}
              />
            </div>
          </div>

          <div className="px-8 py-6 bg-slate-50 border-t border-slate-100/50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Verified Representative Profile</p>
          </div>
        </div>
      </div>
    )}
  </div>
);
};