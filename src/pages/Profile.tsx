import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Star, Award, Clock, Brain, Trophy, Target } from 'lucide-react';
import { REPSScore } from '../components/REPSScore';
import { ProfileEditForm } from '../components/ProfileEditForm';
import api from '../utils/client';

// Define a type for your profile data
interface ProfileData {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  role?: string;
  experience: number;
  industries?: string[];
  keyExpertise?: string[];
  notableCompanies?: string[];
  experienceDetails?: Array<{
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    responsibilities?: string[];
    achievements?: string[];
  }>;
  skills?: string[];
  languages?: Array<{
    language: string;
    proficiency: string;
    assessmentScore: number;
  }>;
  assessmentKPIs?: Record<string, number>;
  completionStatus?: string;
  completionSteps?: Record<string, boolean>;
  lastUpdated: string;
  personalInfo?: {
    name: string;
    location?: string;
    email?: string;
    phone?: string;
  };
  professionalSummary?: {
    yearsOfExperience: string;
    currentRole?: string;
    industries?: string[];
    keyExpertise?: string[];
    notableCompanies?: string[];
  };
}

export function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // For testing, add a token to localStorage if not present
        if (!localStorage.getItem('token')) {
          console.warn('No token found, setting test token for development');
          localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2N2EyMjk1OTgyODE5N2JiMTgwY2FhNTkiLCJpYXQiOjE3NDI0NjQ2ODl9.TW-2zbqDBXsOrf8uujX3FKktc3KmrTa43zPHT9ty_i8');
        }

        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('Authentication token not found');
        }

        // Try directly calling the endpoint with user ID for testing
        try {
          const response = await api.profile.getById('67a22959828197bb180caa59');
          // Process the response data to ensure all nested objects are handled properly
          const profileData = response.data;
          
          console.log('Raw profile data from API:', JSON.stringify(profileData, null, 2));
          
          // Ensure experienceDetails objects have string values
          if (profileData.experienceDetails) {
            console.log('Experience details before processing:', JSON.stringify(profileData.experienceDetails, null, 2));
            
            profileData.experienceDetails = profileData.experienceDetails.map((exp: any) => {
              console.log('Processing experience item:', exp);
              return {
                ...exp,
                responsibilities: Array.isArray(exp.responsibilities) 
                  ? exp.responsibilities.map((r: any) => {
                      console.log('Responsibility type:', typeof r, r);
                      return typeof r === 'string' ? r : JSON.stringify(r);
                    })
                  : [],
                achievements: Array.isArray(exp.achievements)
                  ? exp.achievements.map((a: any) => {
                      console.log('Achievement type:', typeof a, a);
                      return typeof a === 'string' ? a : JSON.stringify(a);
                    })
                  : []
              };
            });
            
            console.log('Experience details after processing:', JSON.stringify(profileData.experienceDetails, null, 2));
          }
          
          setProfile(profileData);
          setLoading(false);
        } catch (idError) {
          console.error('Error fetching by ID, trying default endpoint:', idError);
          // If that fails, fall back to regular profile endpoint
          const response = await api.profile.get();
          
          // Process the response data to ensure all nested objects are handled properly
          const profileData = response.data;
          
          // Ensure experienceDetails objects have string values
          if (profileData.experienceDetails) {
            profileData.experienceDetails = profileData.experienceDetails.map((exp: any) => ({
              ...exp,
              responsibilities: Array.isArray(exp.responsibilities) 
                ? exp.responsibilities.map((r: any) => typeof r === 'string' ? r : JSON.stringify(r))
                : [],
              achievements: Array.isArray(exp.achievements)
                ? exp.achievements.map((a: any) => typeof a === 'string' ? a : JSON.stringify(a))
                : []
            }));
          }
          
          setProfile(profileData);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        
        if (err.response) {
          setError(`Server error: ${err.response.status} - ${err.response.statusText}`);
        } else if (err.request) {
          setError('Network error. Please check your connection and ensure the backend server is running.');
        } else {
          setError(err.message || 'Failed to load profile');
        }
        
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Default REPS scores - no longer derived from assessmentKPIs
  const repsScores = {
    reliability: 85,
    efficiency: 80,
    professionalism: 90,
    service: 85,
  };

  // Generic improvement suggestions
  const improvements = [
    {
      category: 'Response Time Optimization',
      suggestion: 'Implement quick-reply templates for common inquiries to reduce initial response time.',
      impact: 'Could improve efficiency score by 5-7 points',
    },
    {
      category: 'Customer Satisfaction Enhancement',
      suggestion: 'Follow up with customers after resolution to ensure complete satisfaction.',
      impact: 'Potential 4-6 point increase in service score',
    },
    {
      category: 'Knowledge Base Utilization',
      suggestion: 'Increase usage of knowledge base articles during customer interactions.',
      impact: 'Expected 3-5 point boost in efficiency',
    },
  ];

  // Function to handle saving the edited profile
  const handleSaveProfile = (updatedProfile: ProfileData) => {
    console.log('Before processing - updatedProfile:', JSON.stringify(updatedProfile, null, 2));
    
    // Split name into firstName and lastName
    if (updatedProfile.personalInfo && updatedProfile.personalInfo.name) {
      const nameParts = updatedProfile.personalInfo.name.split(' ');
      updatedProfile.firstName = nameParts[0] || '';
      updatedProfile.lastName = nameParts.slice(1).join(' ') || '';
    }
    
    // Convert yearsOfExperience from string to number
    if (updatedProfile.professionalSummary && updatedProfile.professionalSummary.yearsOfExperience) {
      updatedProfile.experience = parseInt(updatedProfile.professionalSummary.yearsOfExperience) || 0;
    }
    
    // Map other fields correctly
    if (updatedProfile.personalInfo) {
      updatedProfile.location = updatedProfile.personalInfo.location || '';
      updatedProfile.email = updatedProfile.personalInfo.email || updatedProfile.email;
      updatedProfile.phone = updatedProfile.personalInfo.phone || '';
    }
    
    if (updatedProfile.professionalSummary) {
      updatedProfile.role = updatedProfile.professionalSummary.currentRole;
      updatedProfile.industries = updatedProfile.professionalSummary.industries;
      updatedProfile.keyExpertise = updatedProfile.professionalSummary.keyExpertise;
      updatedProfile.notableCompanies = updatedProfile.professionalSummary.notableCompanies;
    }
    
    // Ensure all object properties are properly handled
    if (updatedProfile.experienceDetails) {
      updatedProfile.experienceDetails = updatedProfile.experienceDetails.map(exp => {
        return {
          ...exp,
          responsibilities: Array.isArray(exp.responsibilities) 
            ? exp.responsibilities.map(r => typeof r === 'string' ? r : JSON.stringify(r))
            : [],
          achievements: Array.isArray(exp.achievements)
            ? exp.achievements.map(a => typeof a === 'string' ? a : JSON.stringify(a))
            : []
        };
      });
    }
    
    console.log('After processing - updatedProfile:', JSON.stringify(updatedProfile, null, 2));
    
    setProfile(updatedProfile);
    setIsEditing(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading profile...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center mt-8">Error: {error}</div>;
  }

  if (!profile) {
    return <div className="text-center mt-8">No profile data available</div>;
  }

  // If in editing mode, show the edit form
  if (isEditing && profile) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <ProfileEditForm 
          profile={profile} 
          onCancel={() => setIsEditing(false)} 
          onSave={handleSaveProfile} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-start space-x-6">
          {/* Generic profile avatar that doesn't imply gender */}
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-3xl text-blue-600 font-semibold">
              {profile.firstName && profile.firstName[0]}{profile.lastName && profile.lastName[0]}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.firstName} {profile.lastName}
                </h1>
                <p className="text-gray-500">{profile.role || 'HARX Representative'}</p>
              </div>
              <div>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center text-gray-500">
                <Mail className="w-4 h-4 mr-2" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center text-gray-500">
                <Phone className="w-4 h-4 mr-2" />
                <span>{profile.phone || 'Not specified'}</span>
              </div>
              <div className="flex items-center text-gray-500">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{profile.location || 'Not specified'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">REPS Performance Score</h2>
          <div className="flex items-center space-x-2 bg-purple-50 px-4 py-2 rounded-lg">
            <Brain className="w-5 h-5 text-purple-600" />
            <span className="text-purple-600 font-medium">AI-Powered Insights</span>
          </div>
        </div>
        <REPSScore scores={repsScores} improvements={improvements} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Experience</h2>
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{profile.experience} years</div>
          <p className="text-sm text-gray-500">As a {profile.role}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Industries</h2>
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {profile.industries && profile.industries.length > 0 ? (
              profile.industries.map((industry, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
                >
                  {industry}
                </span>
              ))
            ) : (
              <span className="text-gray-500">No industries specified</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Notable Companies</h2>
            <Award className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="flex flex-col space-y-2">
            {profile.notableCompanies && profile.notableCompanies.length > 0 ? (
              profile.notableCompanies.map((company, index) => (
                <span key={index} className="text-gray-700">{company}</span>
              ))
            ) : (
              <span className="text-gray-500">No companies specified</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Expertise</h2>
        <div className="space-y-2">
          {profile.keyExpertise && profile.keyExpertise.length > 0 ? (
            profile.keyExpertise.map((expertise, index) => (
              <div key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>{expertise}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No key expertise specified</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills & Expertise</h2>
        <div className="flex flex-wrap gap-2">
          {profile.skills && profile.skills.length > 0 ? (
            profile.skills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-gray-500">No skills specified</span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Languages</h2>
        <div className="space-y-3">
          {profile.languages && profile.languages.length > 0 ? (
            profile.languages.map((lang, index) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{lang.language}</span>
                  <span className="text-gray-500 ml-2">({lang.proficiency})</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-2">Assessment Score:</span>
                  <span className="font-medium">{lang.assessmentScore}/100</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No languages specified</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Center Skills KPIs</h2>
        <div className="space-y-4">
          {profile.assessmentKPIs && Object.keys(profile.assessmentKPIs).length > 0 ? (
            Object.entries(profile.assessmentKPIs).map(([category, score]) => {
              // Ensure score is within 0-100 range for the width property
              const safeScore = Math.min(Math.max(0, score), 100);
              return (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{category}</span>
                    <span className="font-medium text-blue-600">{Math.round(score)}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${safeScore}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500">No assessment KPIs available</p>
          )}
        </div>
      </div>

      {profile.experienceDetails && profile.experienceDetails.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Experience</h2>
          <div className="space-y-6">
            {profile.experienceDetails.map((exp, index) => {
              // Ensure all properties are properly stringified
              const experienceItem = {
                ...exp,
                title: typeof exp.title === 'string' ? exp.title : JSON.stringify(exp.title),
                company: typeof exp.company === 'string' ? exp.company : JSON.stringify(exp.company),
                startDate: typeof exp.startDate === 'string' ? exp.startDate : JSON.stringify(exp.startDate),
                endDate: exp.endDate && typeof exp.endDate === 'string' ? exp.endDate : exp.endDate ? JSON.stringify(exp.endDate) : 'Present',
                responsibilities: Array.isArray(exp.responsibilities) 
                  ? exp.responsibilities.map(r => typeof r === 'string' ? r : JSON.stringify(r))
                  : [],
                achievements: Array.isArray(exp.achievements)
                  ? exp.achievements.map(a => typeof a === 'string' ? a : JSON.stringify(a))
                  : []
              };
              
              return (
                <div key={index} className="border-l-2 border-blue-200 pl-4 py-2">
                  <div className="flex justify-between">
                    <h3 className="font-medium text-gray-900">{experienceItem.title}</h3>
                    <span className="text-sm text-gray-500">
                      {experienceItem.startDate} - {experienceItem.endDate || 'Present'}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">{experienceItem.company}</p>
                  {experienceItem.responsibilities && experienceItem.responsibilities.length > 0 && (
                    <>
                      <h4 className="mt-2 text-sm font-medium text-gray-700">Responsibilities:</h4>
                      <ul className="mt-1 space-y-1 list-disc list-inside text-gray-600 text-sm">
                        {experienceItem.responsibilities.map((resp, idx) => (
                          <li key={idx}>{resp}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {experienceItem.achievements && experienceItem.achievements.length > 0 && (
                    <>
                      <h4 className="mt-2 text-sm font-medium text-gray-700">Achievements:</h4>
                      <ul className="mt-1 space-y-1 list-disc list-inside text-gray-600 text-sm">
                        {experienceItem.achievements.map((achievement, idx) => (
                          <li key={idx}>{achievement}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Status</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Status</span>
            <span className="px-3 py-1 rounded-full text-sm font-medium uppercase" 
                  style={{ 
                    backgroundColor: profile.completionStatus === 'complete' ? '#d1fae5' : '#fee2e2',
                    color: profile.completionStatus === 'complete' ? '#047857' : '#b91c1c'
                  }}>
              {profile.completionStatus || 'Incomplete'}
            </span>
          </div>
          {profile.completionSteps && (
            <div className="space-y-2">
              <h3 className="font-medium">Completion Steps</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(profile.completionSteps).map(([step, completed]) => (
                  <div key={step} className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full ${completed ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="capitalize">{step.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="text-sm text-gray-500">
            Last updated: {new Date(profile.lastUpdated).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}