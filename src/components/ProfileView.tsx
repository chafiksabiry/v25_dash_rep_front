import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getProfilePlan, checkCountryMismatch, updateProfileData } from '../utils/profileUtils';
import { repWizardApi, Timezone } from '../services/api/repWizard';

// Components
import { ProfileSidebar } from './profile/ProfileSidebar';
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
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-6">
      {/* Left Sidebar (Identity) */}
      <div className="lg:col-span-4">
        <ProfileSidebar
          profile={profile}
          countryData={countryData}
          countryMismatch={countryMismatch}
          checkingCountryMismatch={checkingCountryMismatch}
          showLoadingSpinner={showLoadingSpinner}
          planData={planData}
          planError={planError}
          overallScore={calculateOverallScore()}
          lastUpdated={formatDate(profile.lastUpdated)}
          handlePublish={handlePublish}
          isPublishing={isPublishing}
          onEditClick={onEditClick}
          setShowImageModal={setShowImageModal}
        />
      </div>

      {/* Right Content (Navigation + Tabs) */}
      <div className="lg:col-span-8 flex flex-col">
        <ProfileNavbar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 min-h-[600px]">
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