import React, { useState } from 'react';
import api from '../utils/client';

interface ProfileEditFormProps {
  profile: {
    _id: string;
    name?: string;
/*     firstName?: string;
    lastName?: string; */
    email?: string;
    phone?: string;
    location?: string;
    role?: string;
    experience?: number;
    industries?: string[];
    keyExpertise?: string[];
    notableCompanies?: string[];
    // Add other fields as needed
  };
  onCancel: () => void;
  onSave: (updatedProfile: any) => void;
}

export function ProfileEditForm({ profile, onCancel, onSave }: ProfileEditFormProps) {
  const [formData, setFormData] = useState({
    personalInfo: {
      name: profile.name || '',
      location: profile.location || '',
      email: profile.email || '',
      phone: profile.phone || '',
    },
    professionalSummary: {
      yearsOfExperience: profile.experience?.toString() || '',
      currentRole: profile.role || '',
      industries: profile.industries || [],
      keyExpertise: profile.keyExpertise || [],
      notableCompanies: profile.notableCompanies || [],
    }
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
        'professionalSummary.currentRole': formData.professionalSummary.currentRole,
        'professionalSummary.yearsOfExperience': formData.professionalSummary.yearsOfExperience,
        'professionalSummary.industries': formData.professionalSummary.industries,
        'professionalSummary.keyExpertise': formData.professionalSummary.keyExpertise,
        'professionalSummary.notableCompanies': formData.professionalSummary.notableCompanies,
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