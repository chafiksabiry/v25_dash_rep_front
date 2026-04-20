import React, { useEffect, useState } from 'react';
import {
  MapPin, Mail, Phone, Linkedin, Github, Target, Clock, Briefcase,
  Calendar, GraduationCap, Medal, Star, ThumbsUp, ThumbsDown, Trophy,
  Edit, CreditCard, X, RefreshCw, CheckCircle, User, Zap, Globe
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

  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.2, rootMargin: '-80px 0px -50% 0px' }
    );

    const sections = ['overview', 'skills', 'languages', 'experience'];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

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
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 p-6">
      <div className="md:col-span-12 flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Profile Information</h1>
        <div className="flex gap-4">
          {profile.status !== 'completed' && (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 flex items-center gap-2 text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
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
            className="px-5 py-2.5 rounded-xl bg-gradient-harx text-white hover:opacity-90 flex items-center gap-2 text-sm font-bold transition-all shadow-md shadow-harx-500/20 hover:shadow-lg hover:shadow-harx-500/30 hover:-translate-y-0.5"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Left Column */}
      <div className="md:col-span-4 space-y-6">
        {/* Profile Header */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-harx-100/40 to-transparent opacity-60"></div>
          <div className="text-center relative z-10">
            <div className="mb-6 mt-4">
              <div
                className="w-36 h-36 rounded-full mx-auto shadow-xl border-4 border-white bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden relative group cursor-pointer ring-4 ring-harx-50"
                title="Click to view photo"
                onClick={() => profile.personalInfo?.photo?.url && setShowImageModal(true)}
              >
                {profile.personalInfo?.photo?.url ? (
                  <>
                    <img
                      src={profile.personalInfo.photo.url}
                      alt={profile.personalInfo?.name || 'Profile'}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="text-white text-sm font-bold bg-white/20 px-3 py-1.5 rounded-full">View Photo</div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-harx-300 bg-gradient-to-br from-harx-50 to-white">
                    {profile.personalInfo?.name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-1 tracking-tight">{profile.personalInfo?.name}</h1>
            <p className="text-sm font-bold text-harx-500 uppercase tracking-wider mb-5">{profile.professionalSummary?.currentRole || 'Representative'}</p>
            <div className="flex items-center justify-center gap-2 text-gray-500 mb-5 font-medium bg-gray-50/80 inline-flex flex-row py-2 px-4 rounded-full border border-gray-100 mx-auto">
              <MapPin className="w-4 h-4 text-harx-400" />
              <span>{countryData?.countryName || 'Country not specified'}</span>
            </div>

            {/* Country mismatch warning */}
            {countryMismatch?.hasMismatch && (
              <div className="mb-5 p-4 bg-orange-50/50 border border-orange-200/50 rounded-2xl text-left">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-orange-800 font-medium">
                      <span className="font-bold">Location Notice:</span> Your profile shows <span className="font-bold">{countryMismatch.selectedCountry}</span>, but your first login was from <span className="font-bold">{countryMismatch.firstLoginCountry}</span>. Please verify your location settings.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {checkingCountryMismatch && showLoadingSpinner && (
              <div className="mb-5 p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl text-left">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <RefreshCw className="animate-spin h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-indigo-800 font-medium">Validating profile information...</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              {profile.personalInfo?.email && (
                <a href={`mailto:${profile.personalInfo.email}`} className="p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:text-harx-500 hover:bg-harx-50 transition-all shadow-sm border border-gray-100 hover:border-harx-100">
                  <Mail className="w-5 h-5" />
                </a>
              )}
              {profile.personalInfo?.phone && (
                <a href={`tel:${profile.personalInfo.phone}`} className="p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:text-harx-500 hover:bg-harx-50 transition-all shadow-sm border border-gray-100 hover:border-harx-100">
                  <Phone className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Plan Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-500">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Subscription Plan</h2>
          </div>
          {planError ? (
            <div className="text-red-600 text-sm mb-2">{planError}</div>
          ) : planData && Object.keys(planData.plan).length > 0 ? (
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-2xl p-5 border border-indigo-100/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <CreditCard className="w-24 h-24" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-indigo-900 tracking-tight">
                      {planData.plan.name}
                    </h3>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                      Active
                    </span>
                  </div>
                  <div className="text-3xl font-black text-indigo-600 mb-4 flex items-baseline gap-1">
                    ${planData.plan.price}
                    <span className="text-sm text-indigo-400 font-bold uppercase tracking-wider">/mo</span>
                  </div>
                  <div className="space-y-2.5 text-sm font-medium text-indigo-800/70">
                    <p className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      Type: <span className="text-indigo-900 font-bold">{planData.plan.targetUserType}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      Started: <span className="text-indigo-900 font-bold">{planData.plan.createdAt ? new Date(planData.plan.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 px-5 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
              <div className="mb-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-gray-100">
                  <CreditCard className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Subscription</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                You haven't selected a subscription plan yet. Choose a plan to unlock all features.
              </p>
            </div>
          )}
        </div>

        {/* Onboarding Status */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-500">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Onboarding Progress</h2>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((phaseNum) => {
              const phaseKey = `phase${phaseNum}`;
              const status = profile.onboardingProgress?.phases?.[phaseKey]?.status || 'pending';
              const isCompleted = status === 'completed';
              const isCurrent = status === 'in_progress';

              return (
                <div key={phaseNum} className="flex items-center gap-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-sm
                    ${isCompleted ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700' :
                      isCurrent ? 'bg-gradient-to-br from-harx-100 to-harx-200 text-harx-700 ring-2 ring-harx-400 ring-offset-2' :
                        'bg-gray-100 text-gray-400 border border-gray-200'}
                  `}>
                    {phaseNum}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-900">
                      Phase {phaseNum}
                    </div>
                    <div className="text-xs font-medium text-gray-500 mt-0.5">
                      {status === 'completed' ? 'Successfully Completed' :
                        status === 'in_progress' ? 'Current Phase' :
                          status === 'blocked' ? 'Needs Attention' :
                            'Awaiting Start'}
                    </div>
                  </div>
                  <div className={`
                    px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm
                    ${status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      status === 'in_progress' ? 'bg-harx-100 text-harx-700' :
                        status === 'blocked' ? 'bg-rose-100 text-rose-700' :
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
              className="w-full mt-6 py-3.5 bg-gradient-harx text-white rounded-xl font-bold hover:shadow-lg hover:shadow-harx-500/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              <span>Continue Onboarding</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Overall Score Card - Using REPS score if available */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-500">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Overall Score</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-100/50 mb-6">
            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 tracking-tighter drop-shadow-sm">
              {overallScore}
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">out of 100</div>
          </div>
          <div className="space-y-4">
            {profile.skills?.contactCenter?.[0]?.assessmentResults?.keyMetrics && (
              <>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">Professionalism</span>
                    <span className="text-sm font-black text-harx-500">{profile.skills.contactCenter[0].assessmentResults.keyMetrics.professionalism || 0}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                      style={{ width: `${profile.skills.contactCenter[0].assessmentResults.keyMetrics.professionalism || 0}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">Effectiveness</span>
                    <span className="text-sm font-black text-harx-500">{profile.skills.contactCenter[0].assessmentResults.keyMetrics.effectiveness || 0}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                      style={{ width: `${profile.skills.contactCenter[0].assessmentResults.keyMetrics.effectiveness || 0}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">Customer Focus</span>
                    <span className="text-sm font-black text-harx-500">{profile.skills.contactCenter[0].assessmentResults.keyMetrics.customerFocus || 0}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                      style={{ width: `${profile.skills.contactCenter[0].assessmentResults.keyMetrics.customerFocus || 0}%` }}
                    />
                  </div>
                </div>
              </>
            )}
            {!profile.skills?.contactCenter?.[0]?.assessmentResults?.keyMetrics && (
              <div className="text-center py-6 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500 font-medium text-sm">
                No assessment metrics available
              </div>
            )}
          </div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center mt-6 pt-4 border-t border-gray-100">
            Last updated: {lastUpdated}
          </div>
        </div>

        {/* Availability Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-6 h-6 text-harx-500" />
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
                      className={`flex items-center justify-between p-3 rounded ${daySchedule ? 'bg-blue-50 text-blue-900' : 'bg-gray-50 text-gray-500'
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
            )}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="md:col-span-8 space-y-8">
        {/* Section Navbar */}
        <div className="sticky top-0 z-30 -mx-2 px-2 py-3 bg-gray-50/80 backdrop-blur-md">
          <nav className="flex items-center gap-1 p-1.5 bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100">
            {[
              { id: 'overview', label: 'Profile', icon: User },
              { id: 'skills', label: 'Skills', icon: Zap },
              { id: 'languages', label: 'Languages', icon: Globe },
              { id: 'experience', label: 'Experience', icon: Briefcase },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                  ${activeSection === item.id
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* About Section */}
        <div id="overview" className="scroll-mt-24 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">About</h2>

            {/* Profile Description */}
            <div className="mb-6">
              {profile.professionalSummary?.profileDescription ? (
                <p className="text-gray-700 whitespace-pre-wrap">{profile.professionalSummary.profileDescription}</p>
              ) : (
                <p className="text-gray-500 italic">No profile description available</p>
              )}
            </div>

            {/* Introduction Video Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Introduction Video</h3>

              {profile.personalInfo?.presentationVideo && profile.personalInfo.presentationVideo.url ? (
                <div className="space-y-4">
                  {/* Video Player - Responsive with proper aspect ratio */}
                  <div className="w-full">
                    <video
                      controls
                      className="w-full aspect-video bg-black rounded-lg object-cover"
                      onLoadedMetadata={(e) => {
                        console.log("🎥 EXISTING Video Properties:", {
                          duration: e.currentTarget.duration,
                          videoWidth: e.currentTarget.videoWidth,
                          videoHeight: e.currentTarget.videoHeight,
                          seekable: e.currentTarget.seekable.length > 0,
                          src: e.currentTarget.currentSrc
                        });
                      }}
                    >
                      <source src={profile.personalInfo.presentationVideo.url} type="video/mp4" />
                      <source src={profile.personalInfo.presentationVideo.url} type="video/webm" />
                      Your browser does not support the video tag.
                    </video>
                  </div>

                  {/* Video Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 space-y-2">
                      {profile.personalInfo.presentationVideo.duration && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Duration: {Math.floor(profile.personalInfo.presentationVideo.duration)}s</span>
                        </div>
                      )}
                      {profile.personalInfo.presentationVideo.recordedAt && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Recorded: {new Date(profile.personalInfo.presentationVideo.recordedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Presentation video is required. Please record a video introduction to complete your profile.
                </div>
              )}
            </div>
          </div>

          {/* Years of Experience Section */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Years of Experience</h2>
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
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Industries</h2>
            {(!profile.professionalSummary?.industries || profile.professionalSummary.industries.length === 0) && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Industries are required. Please add the industries you work in.
              </div>
            )}
            {profile.professionalSummary?.industries?.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {profile.professionalSummary.industries.map((industry: any, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                    {typeof industry === 'string' ? industry : industry.name || industry._id}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No industries listed</p>
            )}
          </div>

          {/* Activities Section */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Activities</h2>
            {(!profile.professionalSummary?.activities || profile.professionalSummary.activities.length === 0) && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Activities are required. Please add the activities you can perform.
              </div>
            )}
            {profile.professionalSummary?.activities && profile.professionalSummary.activities.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {profile.professionalSummary.activities.map((activity: any, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm">
                    {typeof activity === 'string' ? activity : activity.name || activity._id}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No activities listed</p>
            )}
          </div>

          {/* Notable Companies Section */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Notable Companies</h2>
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
        </div>

        {/* Skills Group Section */}
        <div id="skills" className="scroll-mt-24 space-y-6">
          {/* Technical Skills Section */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Technical Skills</h2>
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
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Professional Skills</h2>
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
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Soft Skills</h2>
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
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Contact Center Skills</h2>
            {(!profile.skills?.contactCenter || !profile.skills.contactCenter.some((skill: ContactCenterSkill) => skill.assessmentResults)) && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                You should be assessed in at least one contact center skill.
              </div>
            )}
            <div className="space-y-8">
              {[
                ...CONTACT_CENTER_SKILLS,
                {
                  name: "Activities",
                  skills: (profile.professionalSummary?.activities || []).map((a: any) => typeof a === 'string' ? a : a.name)
                },
                {
                  name: "Industries",
                  skills: (profile.professionalSummary?.industries || []).map((i: any) => typeof i === 'string' ? i : i.name)
                }
              ].filter(category => category.skills.length > 0).map((category) => (
                <div key={category.name} className="mb-8">
                  <h3 className="text-xl font-medium text-gray-800 mb-4 pb-2 border-b">{category.name}</h3>
                  <div className="space-y-4">
                    {category.skills.map((skillName: string) => {
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
                              onClick={() => takeContactCenterSkillAssessment(skillName, category.name)}
                              className="px-3 py-1 bg-harx-500 hover:bg-harx-600 text-white text-sm rounded-lg transition-colors"
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
        </div>

        {/* Languages Section */}
        <div id="languages" className="scroll-mt-24 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Languages</h2>
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
                const languageName = typeof lang.language === 'object' && lang.language ? lang.language.name : 'Unknown Language';
                const languageCode = typeof lang.language === 'object' && lang.language ? lang.language.code : '';

                return (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-gray-800">
                        {languageName}
                        {languageCode && <span className="text-gray-500 ml-1">({languageCode})</span>}
                      </h3>
                      <div className="flex items-center">
                        {[...Array(6)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="mb-4 flex justify-between items-center">
                      <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {lang.proficiency}
                      </span>
                      <button
                        onClick={() => takeLanguageAssessment(languageName, languageCode)}
                        className="px-3 py-1 bg-harx-500 hover:bg-harx-600 text-white text-sm rounded-lg transition-colors"
                      >
                        {lang.assessmentResults ? 'Retake Assessment' : 'Take Assessment'}
                      </button>
                    </div>
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

        {/* Experience Section */}
        <div id="experience" className="scroll-mt-24 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Experience</h2>
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
                const formatDateToDD_MM_YYYY = (dateString: string) => {
                  if (!dateString) return '';
                  try {
                    const date = new Date(dateString);
                    return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
                  } catch (e) { return dateString; }
                };
                const startDate = formatDateToDD_MM_YYYY(exp.startDate);
                let endDate = exp.endDate === 'present' ? 'Present' : exp.endDate ? formatDateToDD_MM_YYYY(exp.endDate) : 'Present';
                return (
                  <div key={index} className="border-l-2 border-harx-500 pl-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-gray-800">{exp.title || exp.role || 'Position'}</h3>
                        <p className="text-gray-600">{exp.company || 'Company'}</p>
                      </div>
                      <span className="text-sm text-gray-500">{startDate} - {endDate}</span>
                    </div>
                    {exp.description && <p className="text-gray-700 mt-2">{exp.description}</p>}
                    {exp.responsibilities?.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Responsibilities:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {exp.responsibilities.map((r: string, idx: number) => <li key={idx} className="text-sm text-gray-600">{r}</li>)}
                        </ul>
                      </div>
                    )}
                    {exp.achievements?.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Key Achievements:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {exp.achievements.map((a: string, idx: number) => <li key={idx} className="text-sm text-gray-600">{a}</li>)}
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
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">My Profile Image</h3>
            </div>
            <button
              className="absolute top-4 right-4 p-2 bg-white rounded-full text-gray-600 hover:text-gray-900 shadow-lg z-10"
              onClick={() => setShowImageModal(false)}
            >
              <X className="w-6 h-6" />
            </button>
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