import React, { useEffect, useState } from 'react';
import { X, MapPin, Mail, Phone, Target, Briefcase, RefreshCw, Check, Edit } from 'lucide-react';
import { getProfilePlan, checkCountryMismatch, updateProfileData } from '../utils/profileUtils';
import { repWizardApi, Timezone } from '../services/api/repWizard';

// Components
import { ProfileNavbar } from './profile/ProfileNavbar';

// Tabs
import { ProfileTab } from './profile/tabs/ProfileTab';
import { SkillsTab } from './profile/tabs/SkillsTab';
import { ExperienceTab } from './profile/tabs/ExperienceTab';
import { LanguagesTab } from './profile/tabs/LanguagesTab';
import { OnboardingTab } from './profile/tabs/OnboardingTab';

// Shared Interface Redefinitions (if needed by tabs)
export interface AssessmentResults {
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

export interface Language {
  language: string;
  proficiency: string;
  iso639_1?: string;
  assessmentResults?: AssessmentResults;
}

export interface ContactCenterSkill {
  skill: string;
  proficiency?: string;
  assessmentResults?: AssessmentResults;
}

export interface Plan {
  _id: string;
  name: string;
  price: number;
  targetUserType: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanResponse {
  _id: string;
  userId: string;
  plan: Partial<Plan>;
}

export const ProfileView: React.FC<{ profile: any, onEditClick: () => void, onProfileUpdate?: (updatedProfile: any) => void }> = ({ profile, onEditClick, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isPublishing, setIsPublishing] = useState(false);
  const [planData, setPlanData] = useState<PlanResponse | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [countryData, setCountryData] = useState<Timezone | null>(null);
  const [timezoneData, setTimezoneData] = useState<Timezone | null>(null);
  const [allTimezones, setAllTimezones] = useState<Timezone[]>([]);
  const [countries, setCountries] = useState<Timezone[]>([]);

  const [countryMismatch, setCountryMismatch] = useState<{
    hasMismatch: boolean;
    firstLoginCountry?: string;
    selectedCountry?: string;
    firstLoginCountryCode?: string;
  } | null>(null);
  const [checkingCountryMismatch, setCheckingCountryMismatch] = useState(false);
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);

  // Load countries and all timezones on component mount
  useEffect(() => {
    const loadLocationData = async () => {
      try {
        const [countriesData, timezonesData] = await Promise.all([
          repWizardApi.getCountries(),
          repWizardApi.getTimezones()
        ]);
        setCountries(countriesData);
        setAllTimezones(timezonesData);
      } catch (error) {
        console.error('Error loading location data:', error);
      }
    };
    loadLocationData();
  }, []);

  // Fetch plan data
  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        if (!profile?._id) return;
        const data = await getProfilePlan(profile._id);
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

  // Load specific country and timezone data based on profile
  useEffect(() => {
    const loadSpecificLocationDetails = async () => {
      try {
        if (profile?.personalInfo?.country) {
          if (typeof profile.personalInfo.country === 'string') {
            const country = await repWizardApi.getTimezoneById(profile.personalInfo.country);
            setCountryData(country);
          } else {
            setCountryData(profile.personalInfo.country);
          }
        }
        if (profile?.availability?.timeZone) {
          if (typeof profile.availability.timeZone === 'string') {
            const timezone = await repWizardApi.getTimezoneById(profile.availability.timeZone);
            setTimezoneData(timezone);
          } else {
            setTimezoneData(profile.availability.timeZone);
          }
        }
      } catch (error) {
        console.error('Error loading profile location details:', error);
      }
    };
    loadSpecificLocationDetails();
  }, [profile?.personalInfo?.country, profile?.availability?.timeZone]);

  // Check country mismatch
  useEffect(() => {
    const checkMismatch = async () => {
      if (!countryData || countries.length === 0) return;
      try {
        setCheckingCountryMismatch(true);
        const spinnerTimer = setTimeout(() => setShowLoadingSpinner(true), 800);
        const mismatchResult = await checkCountryMismatch(countryData.countryCode, countries);
        clearTimeout(spinnerTimer);
        if (mismatchResult) setCountryMismatch(mismatchResult);
      } catch (error) {
        console.error('Error checking country mismatch:', error);
      } finally {
        setCheckingCountryMismatch(false);
        setShowLoadingSpinner(false);
      }
    };
    checkMismatch();
  }, [countryData, countries]);

  if (!profile) return null;

  // Helper functions used by tabs
  const getProficiencyStars = (proficiency: string): number => {
    const map: Record<string, number> = { 'A1': 1, 'Basic': 1, 'A2': 2, 'B1': 3, 'Intermediate': 3, 'B2': 4, 'C1': 5, 'Advanced': 5, 'C2': 6, 'Native': 6 };
    return map[proficiency] || 0;
  };

  const getTimezoneMismatchInfo = () => {
    const currentTimezoneId = typeof profile.availability?.timeZone === 'object' ? profile.availability.timeZone._id : profile.availability?.timeZone;
    const selectedTimezoneData = allTimezones.find(tz => tz._id === currentTimezoneId);
    if (!countryData || !selectedTimezoneData || !currentTimezoneId) return null;
    if (selectedTimezoneData.countryCode !== countryData.countryCode) {
      const timezoneCountryData = countries.find(c => c.countryCode === selectedTimezoneData.countryCode);
      return {
        timezoneCountry: timezoneCountryData?.countryName || selectedTimezoneData.countryCode,
        selectedCountry: countryData.countryName,
        timezoneName: selectedTimezoneData.zoneName
      };
    }
    return null;
  };

  const calculateOverallScore = () => {
    if (!profile.skills?.contactCenter?.length || !profile.skills.contactCenter[0]?.assessmentResults?.keyMetrics) return 'N/A';
    const { professionalism = 0, effectiveness = 0, customerFocus = 0 } = profile.skills.contactCenter[0].assessmentResults.keyMetrics;
    return Math.floor((professionalism + effectiveness + customerFocus) / 3);
  };

  const findSkillData = (skillName: string) => {
    return profile.skills?.contactCenter?.find((s: any) => s.skill === skillName) || null;
  };

  const formatSkillsForDisplay = (skillsData: any) => {
    if (!Array.isArray(skillsData)) return [];
    return skillsData.map(item => {
      if (typeof item === 'string') return { name: item };
      if (item.skill && typeof item.skill === 'object') return { name: item.skill.name };
      return { name: item.name || item.skill || 'Unknown' };
    });
  };

  const takeLanguageAssessment = (language: string, iso639_1Code?: string) => {
    const isStandalone = import.meta.env.VITE_RUN_MODE === 'standalone';
    const baseUrl = isStandalone ? import.meta.env.VITE_ASSESSMENT_APP_STANDALONE : import.meta.env.VITE_ASSESSMENT_APP;
    window.location.href = `${baseUrl}/language?lang=${language}&code=${iso639_1Code}`;
  };

  const takeContactCenterSkillAssessment = (skillName: string, categoryName?: string) => {
    const formattedSkill = skillName.toLowerCase().replace(/\s+/g, '-');
    const isStandalone = import.meta.env.VITE_RUN_MODE === 'standalone';
    const baseUrl = isStandalone ? import.meta.env.VITE_ASSESSMENT_APP_STANDALONE : import.meta.env.VITE_ASSESSMENT_APP;
    let url = `${baseUrl}/contact-center/${formattedSkill}`;
    if (categoryName) url += `?cat=${encodeURIComponent(categoryName)}`;
    window.location.href = url;
  };

  const handlePublish = async () => {
    if (!profile?._id) return;
    try {
      setIsPublishing(true);
      const updatedData = await updateProfileData(profile._id, { status: 'completed' });
      if (onProfileUpdate) onProfileUpdate(updatedData);
    } catch (error) {
      console.error('Error publishing profile:', error);
      alert('Failed to publish profile.');
    } finally {
      setIsPublishing(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try { return new Date(dateString).toLocaleDateString(); } catch (e) { return dateString; }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab profile={profile} />;
      case 'skills': return (
        <SkillsTab 
          profile={profile} 
          formatSkillsForDisplay={formatSkillsForDisplay}
          findSkillData={findSkillData}
          takeContactCenterSkillAssessment={takeContactCenterSkillAssessment}
        />
      );
      case 'experience': return <ExperienceTab profile={profile} />;
      case 'languages': return (
        <LanguagesTab 
          profile={profile} 
          getProficiencyStars={getProficiencyStars}
          takeLanguageAssessment={takeLanguageAssessment}
        />
      );
      case 'onboarding': return (
        <OnboardingTab 
          profile={profile}
          countryMismatch={countryMismatch}
          checkingCountryMismatch={checkingCountryMismatch}
          showLoadingSpinner={showLoadingSpinner}
          timezoneData={timezoneData}
          getTimezoneMismatchInfo={getTimezoneMismatchInfo}
          repWizardApi={repWizardApi}
        />
      );
      default: return <ProfileTab profile={profile} />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-10">
      {/* Header / Identity Section (Twilio Style) */}
      <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-10 items-start">
          {/* Photo management */}
          <div className="relative group shrink-0">
            <div 
              className="w-40 h-40 rounded-[32px] shadow-xl border-4 border-white bg-gray-50 overflow-hidden relative cursor-pointer ring-4 ring-harx-50"
              onClick={() => profile.personalInfo?.photo?.url && setShowImageModal(true)}
            >
              {profile.personalInfo?.photo?.url ? (
                <img 
                  src={profile.personalInfo.photo.url} 
                  alt="Profile" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-black text-gray-200 bg-gray-50 uppercase tracking-tighter">
                  {profile.personalInfo?.name?.charAt(0) || '?'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                <div className="text-white text-xs font-black uppercase tracking-widest bg-white/20 px-4 py-2 rounded-full border border-white/30 truncate">View Photo</div>
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          <div className="flex-1 w-full relative">
            {/* Action Buttons Top Right */}
            <div className="flex flex-wrap gap-3 mb-8 pb-6 border-b border-gray-50 justify-between items-center">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">{profile.personalInfo?.name}</h1>
                <p className="text-sm font-bold text-harx-500 uppercase tracking-widest italic">{profile.professionalSummary?.currentRole || 'Representative'}</p>
              </div>
              <div className="flex items-center gap-3">
                {profile.status !== 'completed' && (
                  <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="px-6 py-2.5 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50"
                  >
                    {isPublishing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check size={16} />}
                    {isPublishing ? 'Publishing...' : 'Publish'}
                  </button>
                )}
                <button
                  onClick={onEditClick}
                  className="px-6 py-2.5 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                >
                  <Edit size={16} />
                  Edit Profile
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
              {/* Location */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Country</label>
                <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-harx-200 transition-colors">
                  <MapPin className="w-3.5 h-3.5 text-harx-400" />
                  <span className="text-sm font-bold text-gray-900">{countryData?.countryName || 'Not specified'}</span>
                  {countryMismatch?.hasMismatch && (
                    <div className="ml-auto w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="Location mismatch" />
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Direct Contact</label>
                <a href={`mailto:${profile.personalInfo?.email}`} className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-harx-500 hover:text-harx-600 transition-all">
                  <Mail className="w-3.5 h-3.5 text-gray-400 group-hover:text-harx-500" />
                  <span className="text-sm font-bold truncate max-w-[120px]">{profile.personalInfo?.email || 'N/A'}</span>
                </a>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Line</label>
                <a href={`tel:${profile.personalInfo?.phone}`} className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-harx-500 hover:text-harx-600 transition-all">
                  <Phone className="w-3.5 h-3.5 text-gray-400 group-hover:text-harx-500" />
                  <span className="text-sm font-bold">{profile.personalInfo?.phone || 'N/A'}</span>
                </a>
              </div>
            </div>

            {/* Quick Stats Grid (Score & Plan) */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-2xl border border-indigo-100 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                    <Target size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">REPS Score (Overall)</div>
                    <div className="text-2xl font-black text-indigo-900 tracking-tighter leading-none mt-0.5">{calculateOverallScore()} / 100</div>
                  </div>
               </div>

               <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-100 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Growth Plan</div>
                    <div className="text-lg font-black text-emerald-900 tracking-tight leading-none mt-0.5">
                      {planData?.plan?.name || "Standard Representative"}
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        <ProfileNavbar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 min-h-[600px] mt-8">
          {renderActiveTab()}
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && profile.personalInfo?.photo?.url && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors z-10" onClick={() => setShowImageModal(false)}>
              <X size={24} />
            </button>
            <img src={profile.personalInfo.photo.url} alt="Profile" className="w-full h-auto object-contain" style={{ maxHeight: '80vh' }} />
          </div>
        </div>
      )}
    </div>
  );
};