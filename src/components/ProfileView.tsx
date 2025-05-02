import React from 'react';
import { 
  MapPin, Mail, Phone, Linkedin, Github, Target, Clock, Briefcase, 
  Calendar, GraduationCap, Medal, Star, ThumbsUp, ThumbsDown, Trophy 
} from 'lucide-react';

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

export const ProfileView: React.FC<{ profile: any }> = ({ profile }) => {
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
    // Use provided ISO code or try to derive it from language name
    const langCode = iso639_1Code || getIso639CodeFromLanguage(language);
    const assessmentUrl = `${import.meta.env.VITE_ASSESSMENT_APP}/language/${langCode}`;
    window.open(assessmentUrl, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 p-6">
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

        {/* Availability Card */}
        {profile.availability && (
          <div className="bg-white rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold">Availability</h2>
            </div>
            
            <div className="space-y-4">
              {profile.availability.hours ? (
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
                {profile.availability.days && profile.availability.days.length > 0 ? (
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
                {profile.availability.timeZones && profile.availability.timeZones.length > 0 ? (
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
                {profile.availability.flexibility && profile.availability.flexibility.length > 0 ? (
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
        )}

        {/* Industries Card */}
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold">Industries</h2>
          </div>
          {profile.professionalSummary?.industries && profile.professionalSummary.industries.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.professionalSummary.industries.map((industry: string, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-sm">
                  {industry}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No industries specified</p>
          )}
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Current Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Profile Status</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                profile.status === 'completed' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {profile.status || 'In Progress'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Industry</span>
              <span className="text-gray-800">
                {profile.professionalSummary?.industries?.join(', ') || 'Not specified'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Experience</span>
              <span className="text-gray-800">
                {profile.professionalSummary?.yearsOfExperience || 'Not specified'} years
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="md:col-span-8 space-y-6">
        {/* About Section */}
        {profile.professionalSummary?.profileDescription && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">About</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{profile.professionalSummary.profileDescription}</p>
          </div>
        )}

        {/* Technical Skills Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Technical Skills</h2>
          {profile.skills?.technical?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.technical.map((skill: any, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {typeof skill === 'string' ? skill : skill.skill || ''}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No technical skills listed</p>
          )}
        </div>
        
        {/* Professional Skills Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Professional Skills</h2>
          {profile.skills?.professional?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.professional.map((skill: any, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {typeof skill === 'string' ? skill : skill.skill || ''}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No professional skills listed</p>
          )}
        </div>
        
        {/* Soft Skills Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Soft Skills</h2>
          {profile.skills?.soft?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.soft.map((skill: any, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                  {typeof skill === 'string' ? skill : skill.skill || ''}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No soft skills listed</p>
          )}
        </div>
        
        {/* Contact Center Skills Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">Contact Center Skills</h2>
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
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Languages Section */}
        {profile.personalInfo?.languages?.length > 0 && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-6">Languages</h2>
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
          </div>
        )}

        {/* Experience Section */}
        {profile.experience?.length > 0 && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-6">Experience</h2>
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
          </div>
        )}
        
        {/* Notable Companies */}
        {profile.professionalSummary?.notableCompanies?.length > 0 && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Notable Companies</h2>
            <div className="flex flex-wrap gap-3">
              {profile.professionalSummary.notableCompanies.map((company: string, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg text-sm">
                  {company}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Key Expertise */}
        {profile.professionalSummary?.keyExpertise?.length > 0 && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Key Expertise</h2>
            <div className="flex flex-wrap gap-3">
              {profile.professionalSummary.keyExpertise.map((expertise: string, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                  {expertise}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 