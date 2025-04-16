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
            <p className="text-lg text-gray-600 mb-4">{profile.professionalSummary?.currentRole || 'Professional'}</p>
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

        {/* Professional Skills Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">Professional Skills</h2>
          
          {/* Technical Skills */}
          {profile.skills?.technical?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Technical Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.technical.map((skill: any, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {typeof skill === 'string' ? skill : skill.skill || ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Professional Skills */}
          {profile.skills?.professional?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Professional Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.professional.map((skill: any, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    {typeof skill === 'string' ? skill : skill.skill || ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Soft Skills */}
          {profile.skills?.soft?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Soft Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.soft.map((skill: any, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    {typeof skill === 'string' ? skill : skill.skill || ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Contact Center Skills */}
          {profile.skills?.contactCenter?.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">Contact Center Skills</h3>
              <div className="space-y-4">
                {profile.skills.contactCenter.map((skill: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-800">{skill.skill}</h4>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {skill.proficiency}
                      </span>
                    </div>
                    
                    {skill.assessmentResults && (
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {skill.assessmentResults.strengths?.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                              <ThumbsUp className="w-4 h-4 text-green-500" />
                              Strengths
                            </h5>
                            <ul className="space-y-1">
                              {skill.assessmentResults.strengths.map((strength: string, i: number) => (
                                <li key={i} className="text-sm text-gray-600">{strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {skill.assessmentResults.improvements?.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                              <ThumbsDown className="w-4 h-4 text-red-500" />
                              Areas for Improvement
                            </h5>
                            <ul className="space-y-1">
                              {skill.assessmentResults.improvements.map((area: string, i: number) => (
                                <li key={i} className="text-sm text-gray-600">{area}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
                    <div className="mb-4">
                      <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {lang.proficiency}
                      </span>
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