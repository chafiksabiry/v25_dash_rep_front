import React, { useState } from 'react';
import api from '../utils/client';

interface ProfileEditFormProps {
  profile: {
    _id: string;
    personalInfo: {
      name: string;
      location?: string;
      email: string;
      phone?: string;
      languages?: Array<{
        language: string;
        proficiency: string;
        assessmentResults?: {
          completeness: {
            score: number;
            feedback: string;
          };
          fluency: {
            score: number;
            feedback: string;
          };
          proficiency: {
            score: number;
            feedback: string;
          };
          overall: {
            score: number;
            strengths: string;
            areasForImprovement: string;
          };
          completedAt: string;
        };
      }>;
    };
    professionalSummary: {
      yearsOfExperience: string;
      currentRole?: string;
      industries?: string[];
      keyExpertise?: string[];
      notableCompanies?: string[];
      profileDescription?: string;
    };
    skills: {
      technical: Array<{
        skill: string;
        level: number;
        details?: string;
      }>;
      professional: Array<{
        skill: string;
        level: number;
        details?: string;
      }>;
      soft: Array<{
        skill: string;
        level: number;
        details?: string;
      }>;
      contactCenter: Array<{
        skill: string;
        category: string;
        proficiency: string;
        assessmentResults: {
          score: number;
          strengths: string[];
          improvements: string[];
          feedback: string;
          tips: string[];
          keyMetrics: {
            professionalism: number;
            effectiveness: number;
            customerFocus: number;
          };
          completedAt: string;
        };
      }>;
    };
    experience: Array<{
      title: string;
      company: string;
      startDate: string;
      endDate?: string;
      responsibilities?: string[];
      achievements?: string[];
    }>;
  };
  onCancel: () => void;
  onSave: (updatedProfile: any) => void;
}

export function ProfileEditForm({ profile, onCancel, onSave }: ProfileEditFormProps) {
  const [formData, setFormData] = useState({
    personalInfo: {
      name: profile.personalInfo.name || '',
      location: profile.personalInfo.location || '',
      email: profile.personalInfo.email || '',
      phone: profile.personalInfo.phone || '',
      languages: profile.personalInfo.languages || []
    },
    professionalSummary: {
      yearsOfExperience: profile.professionalSummary.yearsOfExperience || '',
      currentRole: profile.professionalSummary.currentRole || '',
      industries: profile.professionalSummary.industries || [],
      keyExpertise: profile.professionalSummary.keyExpertise || [],
      notableCompanies: profile.professionalSummary.notableCompanies || [],
      profileDescription: profile.professionalSummary.profileDescription || ''
    },
    skills: {
      technical: profile.skills.technical || [],
      professional: profile.skills.professional || [],
      soft: profile.skills.soft || [],
      contactCenter: profile.skills.contactCenter || []
    },
    experience: profile.experience || []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const handleArrayInputChange = (section: string, field: string, index: number, value: string) => {
    setFormData(prev => {
      if (!prev[section as keyof typeof prev]) {
        return prev;
      }
      
      const sectionData = prev[section as keyof typeof prev];
      
      if (!sectionData || !(field in sectionData)) {
        return prev;
      }
      
      const currentArray = sectionData[field as keyof typeof sectionData] as string[];
      if (!Array.isArray(currentArray)) {
        return prev;
      }
      
      const newArray = [...currentArray];
      newArray[index] = value;
      
      return {
        ...prev,
        [section]: {
          ...sectionData,
          [field]: newArray
        }
      };
    });
  };

  const addArrayItem = (section: string, field: string) => {
    setFormData(prev => {
      if (!prev[section as keyof typeof prev]) {
        return prev;
      }
      
      const sectionData = prev[section as keyof typeof prev];
      
      if (!sectionData || !(field in sectionData)) {
        return prev;
      }
      
      const currentArray = sectionData[field as keyof typeof sectionData];
      if (!Array.isArray(currentArray)) {
        return prev;
      }
      
      const newArray = [...currentArray, ''];
      
      return {
        ...prev,
        [section]: {
          ...sectionData,
          [field]: newArray
        }
      };
    });
  };

  const removeArrayItem = (section: string, field: string, index: number) => {
    setFormData(prev => {
      if (!prev[section as keyof typeof prev]) {
        return prev;
      }
      
      const sectionData = prev[section as keyof typeof prev];
      
      if (!sectionData || !(field in sectionData)) {
        return prev;
      }
      
      const currentArray = sectionData[field as keyof typeof sectionData];
      if (!Array.isArray(currentArray)) {
        return prev;
      }
      
      const newArray = [...currentArray];
      newArray.splice(index, 1);
      
      return {
        ...prev,
        [section]: {
          ...sectionData,
          [field]: newArray
        }
      };
    });
  };

  const handleExperienceChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newExperience = [...prev.experience];
      newExperience[index] = {
        ...newExperience[index],
        [field]: value
      };
      return {
        ...prev,
        experience: newExperience
      };
    });
  };

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [...prev.experience, {
        company: '',
        role: '',
        startDate: '',
        endDate: '',
        description: '',
        achievements: []
      }]
    }));
  };

  const removeExperience = (index: number) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const addAchievement = (experienceIndex: number) => {
    setFormData(prev => {
      const newExperience = [...prev.experience];
      newExperience[experienceIndex] = {
        ...newExperience[experienceIndex],
        achievements: [...(newExperience[experienceIndex].achievements || []), '']
      };
      return {
        ...prev,
        experience: newExperience
      };
    });
  };

  const removeAchievement = (experienceIndex: number, achievementIndex: number) => {
    setFormData(prev => {
      const newExperience = [...prev.experience];
      newExperience[experienceIndex] = {
        ...newExperience[experienceIndex],
        achievements: newExperience[experienceIndex].achievements.filter((_, i) => i !== achievementIndex)
      };
      return {
        ...prev,
        experience: newExperience
      };
    });
  };

  // Group assessments by category
  interface Assessment {
    category: string;
    score: number;
  }

  interface AssessmentsByCategory {
    [key: string]: Assessment[];
  }

  interface Assessments {
    contactCenter?: Assessment[];
  }

  const groupAssessmentsByCategory = (assessments: Assessments): AssessmentsByCategory => {
    const assessmentsByCategory: AssessmentsByCategory = {};
    if (assessments.contactCenter && assessments.contactCenter.length > 0) {
      assessments.contactCenter.forEach((assessment: Assessment) => {
        if (!assessmentsByCategory[assessment.category]) {
          assessmentsByCategory[assessment.category] = [];
        }
        assessmentsByCategory[assessment.category].push(assessment);
      });
    }
    return assessmentsByCategory;
  };

  // Calculate KPIs from grouped assessments
  interface CategoryKPIs {
    [key: string]: number;
  }

  const calculateCategoryKPIs = (assessmentsByCategory: AssessmentsByCategory): CategoryKPIs => {
    const categoryKPIs: CategoryKPIs = {};
    Object.keys(assessmentsByCategory).forEach(category => {
      const categoryAssessments = assessmentsByCategory[category];
      const totalScore = categoryAssessments.reduce((sum: number, assessment: Assessment) => sum + assessment.score, 0);
      categoryKPIs[category] = totalScore / categoryAssessments.length;
    });
    return categoryKPIs;
  };

  // handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {      
      // Format the data to match the external API's expected structure
      const profileData = {
        'personalInfo.name': formData.personalInfo.name,
        'personalInfo.email': formData.personalInfo.email,
        'personalInfo.phone': formData.personalInfo.phone,
        'personalInfo.location': formData.personalInfo.location,
        'personalInfo.languages': formData.personalInfo.languages,
        'professionalSummary.currentRole': formData.professionalSummary.currentRole,
        'professionalSummary.yearsOfExperience': formData.professionalSummary.yearsOfExperience,
        'professionalSummary.industries': formData.professionalSummary.industries,
        'professionalSummary.keyExpertise': formData.professionalSummary.keyExpertise,
        'professionalSummary.notableCompanies': formData.professionalSummary.notableCompanies,
        'professionalSummary.profileDescription': formData.professionalSummary.profileDescription,
        'skills.technical': formData.skills.technical,
        'skills.professional': formData.skills.professional,
        'skills.soft': formData.skills.soft,
        'skills.contactCenter': formData.skills.contactCenter,
        'experience': formData.experience
      };
      
      console.log('Profile data being sent to API:', profileData);
      console.log('Profile ID:', profile._id);
      
      // Check for the profile ID
      if (!profile._id) {
        throw new Error('Profile ID is missing');
      }
      
      // Make the API call to update the profile
      const response = await api.profile.update(profile._id, profileData);
      
      console.log('API response data:', response.data);
      
      // Transform the response to match our frontend's expected format
      const formattedResponse = {
        _id: response.data._id,
        userId: response.data.userId,
        name: response.data.personalInfo?.name || '',
        email: response.data.personalInfo?.email || '',
        phone: response.data.personalInfo?.phone || '',
        location: response.data.personalInfo?.location || '',
        languages: response.data.personalInfo?.languages?.map((lang: any) => ({
          language: lang.language,
          proficiency: lang.proficiency,
          assessmentScore: lang.assessmentResults?.overall?.score || 0
        }))  || [],
        role: response.data.professionalSummary?.currentRole || 'HARX Representative',
        experience: parseInt(response.data.professionalSummary?.yearsOfExperience) || 0,
        industries: response.data.professionalSummary?.industries || [],
        keyExpertise: response.data.professionalSummary?.keyExpertise || [],
        notableCompanies: response.data.professionalSummary?.notableCompanies || [],
        experienceDetails: response.data.experience || [],
        skills: response.data.skills ? 
          [...(response.data.skills.technical || []), 
           ...(response.data.skills.professional || []), 
           ...(response.data.skills.soft || [])].map(s => s.skill || s) : [],
        completionStatus: response.data.status,
        completionSteps: response.data.completionSteps,
        assessmentKPIs: calculateCategoryKPIs(groupAssessmentsByCategory(response.data.assessments)),
        lastUpdated: response.data.lastUpdated
      };
      
      console.log('Formatted response for frontend:', JSON.stringify(formattedResponse, null, 2));
      
      // Pass the formatted response to the parent component
      onSave(formattedResponse);
      
    } catch (err: any) {
      console.error('Error updating profile:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.personalInfo.name}
              onChange={(e) => handleInputChange('personalInfo', 'name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.personalInfo.email}
              onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.personalInfo.phone}
              onChange={(e) => handleInputChange('personalInfo', 'phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={formData.personalInfo.location}
              onChange={(e) => handleInputChange('personalInfo', 'location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Languages</label>
            {formData.personalInfo.languages.map((lang: any, index: number) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={lang.language}
                  onChange={(e) => {
                    const newLangs = [...formData.personalInfo.languages];
                    newLangs[index] = { ...lang, language: e.target.value };
                    handleInputChange('personalInfo', 'languages', newLangs);
                  }}
                  placeholder="Language"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <select
                  value={lang.proficiency}
                  onChange={(e) => {
                    const newLangs = [...formData.personalInfo.languages];
                    newLangs[index] = { ...lang, proficiency: e.target.value };
                    handleInputChange('personalInfo', 'languages', newLangs);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Proficiency</option>
                  <option value="Basic">Basic</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Native">Native</option>
                </select>
                <button 
                  type="button"
                  onClick={() => {
                    const newLangs = formData.personalInfo.languages.filter((_, i) => i !== index);
                    handleInputChange('personalInfo', 'languages', newLangs);
                  }}
                  className="bg-red-500 text-white px-3 py-2 rounded-md"
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newLangs = [...formData.personalInfo.languages, { language: '', proficiency: '' }];
                handleInputChange('personalInfo', 'languages', newLangs);
              }}
              className="mt-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Language
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Role</label>
            <input
              type="text"
              value={formData.professionalSummary.currentRole}
              onChange={(e) => handleInputChange('professionalSummary', 'currentRole', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
            <input
              type="text"
              value={formData.professionalSummary.yearsOfExperience}
              onChange={(e) => handleInputChange('professionalSummary', 'yearsOfExperience', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industries</label>
            {formData.professionalSummary.industries.map((industry: string, index: number) => (
              <div key={index} className="flex mb-2">
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => handleArrayInputChange('professionalSummary', 'industries', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                />
                <button 
                  type="button"
                  onClick={() => removeArrayItem('professionalSummary', 'industries', index)}
                  className="bg-red-500 text-white px-3 py-2 rounded-r-md"
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('professionalSummary', 'industries')}
              className="mt-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Industry
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Key Expertise</label>
            {formData.professionalSummary.keyExpertise.map((expertise: string, index: number) => (
              <div key={index} className="flex mb-2">
                <input
                  type="text"
                  value={expertise}
                  onChange={(e) => handleArrayInputChange('professionalSummary', 'keyExpertise', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                />
                <button 
                  type="button"
                  onClick={() => removeArrayItem('professionalSummary', 'keyExpertise', index)}
                  className="bg-red-500 text-white px-3 py-2 rounded-r-md"
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('professionalSummary', 'keyExpertise')}
              className="mt-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Expertise
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notable Companies</label>
            {formData.professionalSummary.notableCompanies.map((company: string, index: number) => (
              <div key={index} className="flex mb-2">
                <input
                  type="text"
                  value={company}
                  onChange={(e) => handleArrayInputChange('professionalSummary', 'notableCompanies', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                />
                <button 
                  type="button"
                  onClick={() => removeArrayItem('professionalSummary', 'notableCompanies', index)}
                  className="bg-red-500 text-white px-3 py-2 rounded-r-md"
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('professionalSummary', 'notableCompanies')}
              className="mt-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Company
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Description</label>
            <textarea
              value={formData.professionalSummary.profileDescription}
              onChange={(e) => handleInputChange('professionalSummary', 'profileDescription', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={4}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills</h2>
        <div className="space-y-6">
          {/* Technical Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technical Skills</label>
            {formData.skills.technical.map((skill: string, index: number) => (
              <div key={index} className="flex mb-2">
                <input
                  type="text"
                  value={skill}
                  onChange={(e) => handleArrayInputChange('skills', 'technical', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                />
                <button 
                  type="button"
                  onClick={() => removeArrayItem('skills', 'technical', index)}
                  className="bg-red-500 text-white px-3 py-2 rounded-r-md"
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('skills', 'technical')}
              className="mt-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Technical Skill
            </button>
          </div>

          {/* Professional Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Professional Skills</label>
            {formData.skills.professional.map((skill: string, index: number) => (
              <div key={index} className="flex mb-2">
                <input
                  type="text"
                  value={skill}
                  onChange={(e) => handleArrayInputChange('skills', 'professional', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                />
                <button 
                  type="button"
                  onClick={() => removeArrayItem('skills', 'professional', index)}
                  className="bg-red-500 text-white px-3 py-2 rounded-r-md"
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('skills', 'professional')}
              className="mt-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Professional Skill
            </button>
          </div>

          {/* Soft Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Soft Skills</label>
            {formData.skills.soft.map((skill: string, index: number) => (
              <div key={index} className="flex mb-2">
                <input
                  type="text"
                  value={skill}
                  onChange={(e) => handleArrayInputChange('skills', 'soft', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                />
                <button 
                  type="button"
                  onClick={() => removeArrayItem('skills', 'soft', index)}
                  className="bg-red-500 text-white px-3 py-2 rounded-r-md"
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('skills', 'soft')}
              className="mt-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Soft Skill
            </button>
          </div>

          {/* Contact Center Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Center Skills</label>
            {formData.skills.contactCenter.map((skill: string, index: number) => (
              <div key={index} className="flex mb-2">
                <input
                  type="text"
                  value={skill}
                  onChange={(e) => handleArrayInputChange('skills', 'contactCenter', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                />
                <button 
                  type="button"
                  onClick={() => removeArrayItem('skills', 'contactCenter', index)}
                  className="bg-red-500 text-white px-3 py-2 rounded-r-md"
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('skills', 'contactCenter')}
              className="mt-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Contact Center Skill
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Experience</h2>
        <div className="space-y-6">
          {formData.experience.map((exp: any, expIndex: number) => (
            <div key={expIndex} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium">Experience {expIndex + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeExperience(expIndex)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => handleExperienceChange(expIndex, 'company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={exp.role}
                    onChange={(e) => handleExperienceChange(expIndex, 'role', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={exp.startDate}
                    onChange={(e) => handleExperienceChange(expIndex, 'startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={exp.endDate}
                    onChange={(e) => handleExperienceChange(expIndex, 'endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={exp.description}
                  onChange={(e) => handleExperienceChange(expIndex, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Achievements</label>
                {exp.achievements.map((achievement: string, achievementIndex: number) => (
                  <div key={achievementIndex} className="flex mb-2">
                    <input
                      type="text"
                      value={achievement}
                      onChange={(e) => {
                        const newExp = { ...exp };
                        newExp.achievements[achievementIndex] = e.target.value;
                        handleExperienceChange(expIndex, 'achievements', newExp.achievements);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                    />
                    <button 
                      type="button"
                      onClick={() => removeAchievement(expIndex, achievementIndex)}
                      className="bg-red-500 text-white px-3 py-2 rounded-r-md"
                    >
                      X
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addAchievement(expIndex)}
                  className="mt-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Achievement
                </button>
              </div>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addExperience}
            className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add New Experience
          </button>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
} 