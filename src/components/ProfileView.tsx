import React, { useEffect, useState } from 'react';
import { 
  MapPin, Mail, Phone, Linkedin, Github, Target, Clock, Briefcase, 
  Calendar, GraduationCap, Medal, Star, ThumbsUp, ThumbsDown, Trophy,
  Edit, CreditCard
} from 'lucide-react';
import { getProfilePlan } from '../utils/profileUtils';

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
  _id: number;
  userId: number;
  plan: Plan;
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

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        if (!profile?._id) return;
        
        const data = await getProfilePlan(profile._id);
        setPlanData(data);
      } catch (error) {
        console.error('Error fetching plan data:', error);
        setPlanError(error instanceof Error ? error.message : 'Failed to fetch plan data');
      }
    };

    fetchPlanData();
  }, [profile?._id]);

  if (!profile) return null;

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
              <div className="w-32 h-32 rounded-full mx-auto shadow-lg border-4 border-white bg-gray-300 flex items-center justify-center text-2xl font-bold text-white">
                {profile.personalInfo?.name?.charAt(0) || '?'}
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{profile.personalInfo?.name}</h1>
            <p className="text-lg text-gray-600 mb-4">{profile.professionalSummary?.currentRole || 'Representative'}</p>
            <div className="flex items-center justify-center gap-2 text-gray-600 mb-4">
              <MapPin className="w-4 h-4" />
              <span>{profile.personalInfo?.location || 'Location not specified'}</span>
            </div>
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
          ) : planData ? (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-xl font-bold text-blue-800 mb-2">
                  {planData.plan.name}
                </h3>
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  ${planData.plan.price}
                </div>
                <div className="text-sm text-gray-600">
                  <p>Type: {planData.plan.targetUserType}</p>
                  <p className="mt-1">
                    Since: {new Date(planData.plan.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
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
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold">Availability</h2>
          </div>
          
          <div className="space-y-4">
            {profile.availability?.hours ? (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Preferred Hours</div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>{profile.availability.hours.start}</span>
                  <span>to</span>
                  <span>{profile.availability.hours.end}</span>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Preferred Hours</div>
                <div className="text-sm text-gray-500 italic">Not specified</div>
              </div>
            )}
            
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Available Days</div>
              {profile.availability?.days && profile.availability.days.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                    const fullDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index];
                    const isAvailable = profile.availability.days?.includes(fullDay);
                    
                    return (
                      <div 
                        key={day} 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          isAvailable 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {day.charAt(0)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">No specific days set</div>
              )}
            </div>
            
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Time Zones</div>
              {profile.availability?.timeZones && profile.availability.timeZones.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.availability.timeZones.map((zone: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-800 rounded text-xs">
                      {zone}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">No specific time zones set</div>
              )}
            </div>
            
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Flexibility</div>
              {profile.availability?.flexibility && profile.availability.flexibility.length > 0 ? (
                <ul className="text-sm text-gray-600 space-y-1 list-disc ml-4">
                  {profile.availability.flexibility.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-500 italic">No flexibility options specified</div>
              )}
            </div>
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
          {profile.skills?.technical?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.technical.map((skill: any, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {typeof skill === 'string' ? skill : skill.skill || ''}
                </span>
              ))}
            </div>
          ) : (
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
          {profile.skills?.professional?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.professional.map((skill: any, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {typeof skill === 'string' ? skill : skill.skill || ''}
                </span>
              ))}
            </div>
          ) : (
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
          {profile.skills?.soft?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.soft.map((skill: any, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                  {typeof skill === 'string' ? skill : skill.skill || ''}
                </span>
              ))}
            </div>
          ) : (
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
    </div>
  );
}; 