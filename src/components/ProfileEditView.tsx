import React, { useState, useEffect } from 'react';
import { 
  MapPin, Mail, Phone, Linkedin, Github, Target, Clock, Briefcase, 
  Calendar, GraduationCap, Medal, Star, ThumbsUp, ThumbsDown, Trophy,
  Edit, Check, X, Save, RefreshCw, Plus, Trash2
} from 'lucide-react';
import { updateProfileData, updateBasicInfo, updateExperience, updateSkills } from '../utils/profileUtils';

// Add CSS styles for error highlighting
const styles = `
  @keyframes highlightError {
    0% { background-color: rgba(239, 68, 68, 0.2); }
    50% { background-color: rgba(239, 68, 68, 0.3); }
    100% { background-color: rgba(239, 68, 68, 0.2); }
  }

  .highlight-error {
    animation: highlightError 1s ease-in-out;
    border-radius: 0.375rem;
    padding: 0.5rem;
  }
`;

// Add styles to document
if (typeof document !== 'undefined' && !document.getElementById('profile-editor-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'profile-editor-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
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

// List of contact center skills for the assessments section
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

// Language proficiency levels
const proficiencyLevels = [
  { value: 'A1', label: 'A1 - Beginner', description: 'Can understand and use basic phrases, introduce themselves' },
  { value: 'A2', label: 'A2 - Elementary', description: 'Can communicate in simple, routine situations' },
  { value: 'B1', label: 'B1 - Intermediate', description: 'Can deal with most situations while traveling, describe experiences' },
  { value: 'B2', label: 'B2 - Upper Intermediate', description: 'Can interact fluently with native speakers, produce clear text' },
  { value: 'C1', label: 'C1 - Advanced', description: 'Can use language flexibly, produce clear well-structured text' },
  { value: 'C2', label: 'C2 - Mastery', description: 'Can understand virtually everything, express spontaneously' }
];

type ProfileEditViewProps = {
  profile: any;
  onSave: (updatedProfile: any) => void;
};

export const ProfileEditView: React.FC<ProfileEditViewProps> = ({ profile: initialProfile, onSave }) => {
  const [profile, setProfile] = useState<any>(initialProfile);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [tempProfileDescription, setTempProfileDescription] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  
  // Track which sections have been modified
  const [modifiedSections, setModifiedSections] = useState({
    personalInfo: false,
    professionalSummary: false,
    skills: false,
    experience: false,
    languages: false,
    availability: false
  });
  
  // Additional state for editing
  const [tempLanguage, setTempLanguage] = useState({ language: '', proficiency: 'B1' });
  const [tempIndustry, setTempIndustry] = useState('');
  const [tempCompany, setTempCompany] = useState('');
  const [tempFlexibility, setTempFlexibility] = useState('');
  const [tempExpertise, setTempExpertise] = useState('');
  const [editingExperience, setEditingExperience] = useState<any>(null);
  const [showNewExperienceForm, setShowNewExperienceForm] = useState(false);
  const [tempSkill, setTempSkill] = useState({
    technical: '',
    professional: '',
    soft: ''
  });

  // Initialize form data state
  const [newExperience, setNewExperience] = useState({
    title: '',
    company: '',
    startDate: '',
    endDate: '',
    responsibilities: [''],
    isPresent: false
  });

  // Add state for editing experience
  const [editingExperienceId, setEditingExperienceId] = useState<number | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      setTempProfileDescription(initialProfile.professionalSummary?.profileDescription || '');
    }
  }, [initialProfile]);

  // Show toast message
  const showToast = (message: string, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Validate profile data
  const validateProfile = () => {
    const errors: Record<string, string> = {};

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Phone validation regex - accepts various formats with optional country code
    const phoneRegex = /^\+?[\d\s-]{10,}$/;

    // Validate languages (at least one required)
    if (!profile.personalInfo?.languages?.length) {
      errors.languages = 'At least one language is required';
    }

    // Validate name
    if (!profile.personalInfo?.name?.trim()) {
      errors.name = 'Name is required';
    }

    // Validate location
    if (!profile.personalInfo?.location?.trim()) {
      errors.location = 'Location is required';
    }

    // Validate email
    if (!profile.personalInfo?.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(profile.personalInfo.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Validate phone
    if (!profile.personalInfo?.phone?.trim()) {
      errors.phone = 'Phone number is required';
    } else if (profile.personalInfo.phone.trim() && !phoneRegex.test(profile.personalInfo.phone.replace(/\s+/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Render error messages
  const renderError = (error: string | undefined, id: string) => {
    if (!error) return null;
    return (
      <div id={`error-${id}`} className="text-red-600 text-sm mt-1 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </div>
    );
  };

  // Handle save with validation
  const handleSave = async () => {
    console.log('🔄 Starting save process...');
    console.log('Modified sections:', modifiedSections);
    console.log('Current profile state:', profile);

    const { isValid, errors } = validateProfile();
    setValidationErrors(errors);
    
    if (!isValid) {
      console.log('❌ Validation failed:', errors);
      showToast('Please fix validation errors before saving', 'error');
      return;
    }

    setLoading(true);
    try {
      // Save personal info if modified
      if (modifiedSections.personalInfo) {
        console.log('📝 Saving personal info...', {
          endpoint: `/api/profiles/${profile._id}/basic-info`,
          data: profile.personalInfo
        });
        await updateBasicInfo(profile._id, profile.personalInfo);
      }

      // Save professional summary if modified
      if (modifiedSections.professionalSummary) {
        console.log('📝 Saving professional summary...', {
          endpoint: `/api/profiles/${profile._id}`,
          data: { professionalSummary: profile.professionalSummary }
        });
        await updateProfileData(profile._id, { professionalSummary: profile.professionalSummary });
      }

      // Save skills if modified
      if (modifiedSections.skills) {
        console.log('📝 Saving skills...');
        // Format skills as objects with proper structure
        const formattedSkills = {
          technical: (profile.skills?.technical || []).map((skill: any) => ({
            skill: typeof skill === 'string' ? skill : skill.skill,
            proficiency: 'Intermediate',
            category: 'Technical',
            level: 1
          })),
          professional: (profile.skills?.professional || []).map((skill: any) => ({
            skill: typeof skill === 'string' ? skill : skill.skill,
            proficiency: 'Intermediate',
            category: 'Professional',
            level: 1
          })),
          soft: (profile.skills?.soft || []).map((skill: any) => ({
            skill: typeof skill === 'string' ? skill : skill.skill,
            proficiency: 'Intermediate',
            category: 'Soft',
            level: 1
          })),
          // Preserve existing contactCenter skills with their assessment results
          contactCenter: (profile.skills?.contactCenter || []).map((skill: any) => ({
            skill: skill.skill || '',
            category: skill.category || 'Customer Service',
            proficiency: skill.proficiency || 'Basic',
            assessmentResults: skill.assessmentResults || {
              score: 0,
              strengths: [],
              improvements: [],
              feedback: '',
              tips: [],
              keyMetrics: {
                professionalism: 0,
                effectiveness: 0,
                customerFocus: 0
              },
              completedAt: new Date().toISOString()
            }
          }))
        };
        
        console.log('Skills data to be sent:', {
          endpoint: `/api/profiles/${profile._id}/skills`,
          data: formattedSkills
        });
        await updateSkills(profile._id, formattedSkills);
      }

      // Save experience if modified
      if (modifiedSections.experience) {
        console.log('📝 Saving experience...', {
          endpoint: `/api/profiles/${profile._id}/experience`,
          data: { experience: profile.experience }
        });
        await updateExperience(profile._id, profile.experience);
      }

      // Save languages if modified
      if (modifiedSections.languages) {
        console.log('📝 Saving languages...', {
          endpoint: `/api/profiles/${profile._id}/basic-info`,
          data: {
            ...profile.personalInfo,
            languages: profile.personalInfo?.languages || []
          }
        });
        await updateBasicInfo(profile._id, {
          ...profile.personalInfo,
          languages: profile.personalInfo?.languages || []
        });
      }

      // Save availability if modified
      if (modifiedSections.availability) {
        console.log('📝 Saving availability...', {
          endpoint: `/api/profiles/${profile._id}`,
          data: { availability: profile.availability }
        });
        await updateProfileData(profile._id, { availability: profile.availability });
      }

      // Reset modified sections
      setModifiedSections({
        personalInfo: false,
        professionalSummary: false,
        skills: false,
        experience: false,
        languages: false,
        availability: false
      });

      console.log('✅ All changes saved successfully');
      showToast('Profile saved successfully', 'success');
      onSave(profile);
    } catch (error: any) {
      console.error('❌ Error saving profile:', {
        error: error.response?.data || error,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      showToast('Failed to save profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle profile changes for personal info
  const handleProfileChange = (field: string, value: any) => {
    // Update local state
    const updatedPersonalInfo = {
      ...profile.personalInfo,
      [field]: value
    };
    
    setProfile((prev: any) => ({
      ...prev,
      personalInfo: updatedPersonalInfo
    }));
    
    // Mark personal info section as modified
    setModifiedSections(prev => ({
      ...prev,
      personalInfo: true
    }));
    
    // Clear validation error for this field if value is valid
    if (value && value.trim()) {
      setValidationErrors((prev: Record<string, string>) => ({
        ...prev,
        [field]: ''
      }));
    }
  };
  
  // Add language to profile
  const addLanguage = () => {
    if (!tempLanguage.language.trim()) {
      setValidationErrors((prev: Record<string, string>) => ({
        ...prev,
        languages: 'Language name is required'
      }));
      return;
    }
    
    const updatedLanguages = [
      ...(profile.personalInfo.languages || []),
      tempLanguage
    ];
    
    // Update local state
    setProfile((prev: any) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        languages: updatedLanguages
      }
    }));
    
    // Mark languages section as modified
    setModifiedSections(prev => ({
      ...prev,
      languages: true
    }));
    
    // Clear any language-related validation errors
    setValidationErrors((prev: Record<string, string>) => ({
      ...prev,
      languages: ''
    }));
    
    // Reset form
    setTempLanguage({ language: '', proficiency: 'B1' });
  };
  
  // Remove language from profile
  const removeLanguage = (index: number) => {
    const updatedLanguages = profile.personalInfo.languages.filter((_: any, i: number) => i !== index);
    
    // Update local state
    setProfile((prev: any) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        languages: updatedLanguages
      }
    }));
    
    // Mark languages section as modified
    setModifiedSections(prev => ({
      ...prev,
      languages: true
    }));
    
    // Set validation error if removing last language
    if (updatedLanguages.length === 0) {
      setValidationErrors((prev: Record<string, string>) => ({
        ...prev,
        languages: 'At least one language is required'
      }));
    }
  };
  
  // Update language proficiency
  const updateLanguageProficiency = (index: number, newProficiency: string) => {
    const updatedLanguages = profile.personalInfo.languages.map((lang: any, i: number) => 
      i === index ? { ...lang, proficiency: newProficiency } : lang
    );
    
    // Update local state
    setProfile((prev: any) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        languages: updatedLanguages
      }
    }));
    
    // Mark languages section as modified
    setModifiedSections(prev => ({
      ...prev,
      languages: true
    }));
  };

  // Add/update skills with proper object structure
  const addSkill = (type: 'technical' | 'professional' | 'soft', skillName: string) => {
    if (skillName.trim()) {
      const skillObject = {
        skill: skillName.trim(),
        proficiency: 'Intermediate',
        category: type.charAt(0).toUpperCase() + type.slice(1),
        level: 1
      };
      
      const updatedSkills = [
        ...(profile.skills?.[type] || []),
        skillObject
      ];
      
      setProfile((prev: any) => ({
        ...prev,
        skills: {
          ...prev.skills,
          [type]: updatedSkills
        }
      }));
      
      setModifiedSections(prev => ({
        ...prev,
        skills: true
      }));
    }
  };

  // Remove skill with proper object handling
  const removeSkill = (type: 'technical' | 'professional' | 'soft', index: number) => {
    const updatedSkills = [...(profile.skills?.[type] || [])];
    updatedSkills.splice(index, 1);
    
    setProfile((prev: any) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [type]: updatedSkills
      }
    }));
    
    setModifiedSections(prev => ({
      ...prev,
      skills: true
    }));
  };

  // Function to start editing an experience
  const startEditingExperience = (index: number) => {
    const experience = profile.experience[index];
    setNewExperience({
      title: experience.title || '',
      company: experience.company || '',
      startDate: experience.startDate ? new Date(experience.startDate).toISOString().split('T')[0] : '',
      endDate: experience.endDate === 'present' ? '' : experience.endDate ? new Date(experience.endDate).toISOString().split('T')[0] : '',
      responsibilities: experience.responsibilities || [''],
      isPresent: experience.endDate === 'present'
    });
    setEditingExperienceId(index);
    setShowNewExperienceForm(true);
  };

  // Function to save edited experience
  const saveEditedExperience = () => {
    if (editingExperienceId !== null) {
      const updatedExperiences = [...profile.experience];
      updatedExperiences[editingExperienceId] = {
        title: newExperience.title,
        company: newExperience.company,
        startDate: newExperience.startDate,
        endDate: newExperience.isPresent ? 'present' : newExperience.endDate,
        responsibilities: newExperience.responsibilities.filter(r => r.trim())
      };

      setProfile((prev: any) => ({
        ...prev,
        experience: updatedExperiences
      }));

      // Mark experience section as modified
      setModifiedSections(prev => ({
        ...prev,
        experience: true
      }));

      // Reset form and editing state
      setShowNewExperienceForm(false);
      setEditingExperienceId(null);
      setNewExperience({
        title: '',
        company: '',
        startDate: '',
        endDate: '',
        responsibilities: [''],
        isPresent: false
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 p-6">
      {/* Page Header with Save/Cancel Buttons */}
      <div className="md:col-span-12 flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        <div className="flex gap-2">
          <button
            onClick={() => onSave(initialProfile)}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save All Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Left Column */}
      <div className="md:col-span-4 space-y-6">
        {/* Profile Header with editable fields */}
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">
            <div className="mb-6">
              <div className="w-32 h-32 rounded-full mx-auto shadow-lg border-4 border-white bg-gray-300 flex items-center justify-center text-2xl font-bold text-white">
                {profile.personalInfo?.name?.charAt(0) || '?'}
              </div>
            </div>
            
            {/* Name Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={profile.personalInfo?.name || ''}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Your name"
              />
              {renderError(validationErrors.name, 'name')}
            </div>
            
            {/* Job Role Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Role</label>
              <input
                type="text"
                value={profile.professionalSummary?.currentRole || ''}
                onChange={(e) => {
                  setProfile((prev: any) => ({
                    ...prev,
                    professionalSummary: {
                      ...prev.professionalSummary,
                      currentRole: e.target.value
                    }
                  }));
                }}
                className="w-full p-2 border rounded-md"
                placeholder="Your current role"
              />
            </div>
            
            {/* Location Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                Location
              </label>
              <input
                type="text"
                value={profile.personalInfo?.location || ''}
                onChange={(e) => handleProfileChange('location', e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Your location"
              />
              {renderError(validationErrors.location, 'location')}
            </div>
            
            {/* Contact Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={profile.personalInfo?.email || ''}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Your email address"
                />
                {renderError(validationErrors.email, 'email')}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={profile.personalInfo?.phone || ''}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Your phone number"
                />
                {renderError(validationErrors.phone, 'phone')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="md:col-span-8 space-y-6">
        {/* About/Professional Summary Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Professional Summary</h2>
          
          {/* Profile Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Description</label>
            <textarea
              value={profile.professionalSummary?.profileDescription || ''}
              onChange={(e) => {
                setProfile((prev: any) => ({
                  ...prev,
                  professionalSummary: {
                    ...prev.professionalSummary,
                    profileDescription: e.target.value
                  }
                }));
                setModifiedSections(prev => ({
                  ...prev,
                  professionalSummary: true
                }));
              }}
              className="w-full p-2 border rounded-md min-h-[120px]"
              placeholder="Describe your professional background and expertise..."
            />
          </div>
          
          {/* Years of Experience */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
            <input
              type="text"
              value={profile.professionalSummary?.yearsOfExperience || ''}
              onChange={(e) => {
                setProfile((prev: any) => ({
                  ...prev,
                  professionalSummary: {
                    ...prev.professionalSummary,
                    yearsOfExperience: e.target.value
                  }
                }));
              }}
              className="w-full p-2 border rounded-md"
              placeholder="e.g., 5"
            />
          </div>
          
          {/* Industries */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Industries</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.professionalSummary?.industries?.map((industry: string, index: number) => (
                <div key={index} className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                  <span className="text-blue-800 text-sm">{industry}</span>
                  <button
                    onClick={() => {
                      const updatedIndustries = [...(profile.professionalSummary?.industries || [])];
                      updatedIndustries.splice(index, 1);
                      setProfile((prev: any) => ({
                        ...prev,
                        professionalSummary: {
                          ...prev.professionalSummary,
                          industries: updatedIndustries
                        }
                      }));
                    }}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tempIndustry}
                onChange={(e) => setTempIndustry(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Add industry"
              />
              <button
                onClick={() => {
                  if (tempIndustry.trim()) {
                    const updatedIndustries = [
                      ...(profile.professionalSummary?.industries || []),
                      tempIndustry.trim()
                    ];
                    setProfile((prev: any) => ({
                      ...prev,
                      professionalSummary: {
                        ...prev.professionalSummary,
                        industries: updatedIndustries
                      }
                    }));
                    setTempIndustry('');
                  }
                }}
                className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"
              >
                Add
              </button>
            </div>
          </div>

          {/* Key Expertise */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Key Expertise</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.professionalSummary?.keyExpertise?.map((expertise: string, index: number) => (
                <div key={index} className="flex items-center bg-green-50 px-3 py-1 rounded-full">
                  <span className="text-green-800 text-sm">{expertise}</span>
                  <button
                    onClick={() => {
                      const updatedExpertise = [...(profile.professionalSummary?.keyExpertise || [])];
                      updatedExpertise.splice(index, 1);
                      setProfile((prev: any) => ({
                        ...prev,
                        professionalSummary: {
                          ...prev.professionalSummary,
                          keyExpertise: updatedExpertise
                        }
                      }));
                    }}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tempExpertise || ''}
                onChange={(e) => setTempExpertise(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Add key expertise"
              />
              <button
                onClick={() => {
                  if (tempExpertise?.trim()) {
                    const updatedExpertise = [
                      ...(profile.professionalSummary?.keyExpertise || []),
                      tempExpertise.trim()
                    ];
                    setProfile((prev: any) => ({
                      ...prev,
                      professionalSummary: {
                        ...prev.professionalSummary,
                        keyExpertise: updatedExpertise
                      }
                    }));
                    setTempExpertise('');
                  }
                }}
                className="px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg"
              >
                Add
              </button>
            </div>
          </div>

          {/* Notable Companies */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notable Companies</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.professionalSummary?.notableCompanies?.map((company: string, index: number) => (
                <div key={index} className="flex items-center bg-purple-50 px-3 py-1 rounded-full">
                  <span className="text-purple-800 text-sm">{company}</span>
                  <button
                    onClick={() => {
                      const updatedCompanies = [...(profile.professionalSummary?.notableCompanies || [])];
                      updatedCompanies.splice(index, 1);
                      setProfile((prev: any) => ({
                        ...prev,
                        professionalSummary: {
                          ...prev.professionalSummary,
                          notableCompanies: updatedCompanies
                        }
                      }));
                    }}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tempCompany}
                onChange={(e) => setTempCompany(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Add notable company"
              />
              <button
                onClick={() => {
                  if (tempCompany.trim()) {
                    const updatedCompanies = [
                      ...(profile.professionalSummary?.notableCompanies || []),
                      tempCompany.trim()
                    ];
                    setProfile((prev: any) => ({
                      ...prev,
                      professionalSummary: {
                        ...prev.professionalSummary,
                        notableCompanies: updatedCompanies
                      }
                    }));
                    setTempCompany('');
                  }
                }}
                className="px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg"
              >
                Add
              </button>
            </div>
          </div>
        </div>
        
        {/* Skills Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Skills</h2>
          
          {/* Technical Skills */}
          <div className="mb-6 border-b pb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Technical Skills</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.skills?.technical?.map((skill: any, index: number) => (
                <div key={index} className="flex items-center bg-blue-100 px-3 py-1 rounded-full">
                  <span className="text-blue-800 text-sm">{typeof skill === 'string' ? skill : skill.skill}</span>
                  <button
                    onClick={() => removeSkill('technical', index)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={tempSkill.technical}
                onChange={(e) => setTempSkill((prev: any) => ({ ...prev, technical: e.target.value }))}
                className="w-full p-2 border rounded-md"
                placeholder="Add technical skill"
              />
              <button
                onClick={() => {
                  addSkill('technical', tempSkill.technical);
                  setTempSkill((prev: any) => ({ ...prev, technical: '' }));
                }}
                className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </div>
          
          {/* Professional Skills */}
          <div className="mb-6 border-b pb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Professional Skills</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.skills?.professional?.map((skill: any, index: number) => (
                <div key={index} className="flex items-center bg-green-100 px-3 py-1 rounded-full">
                  <span className="text-green-800 text-sm">{typeof skill === 'string' ? skill : skill.skill}</span>
                  <button
                    onClick={() => removeSkill('professional', index)}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={tempSkill.professional}
                onChange={(e) => setTempSkill((prev: any) => ({ ...prev, professional: e.target.value }))}
                className="w-full p-2 border rounded-md"
                placeholder="Add professional skill"
              />
              <button
                onClick={() => {
                  addSkill('professional', tempSkill.professional);
                  setTempSkill((prev: any) => ({ ...prev, professional: '' }));
                }}
                className="px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </div>
          
          {/* Soft Skills */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Soft Skills</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.skills?.soft?.map((skill: any, index: number) => (
                <div key={index} className="flex items-center bg-purple-100 px-3 py-1 rounded-full">
                  <span className="text-purple-800 text-sm">{typeof skill === 'string' ? skill : skill.skill}</span>
                  <button
                    onClick={() => removeSkill('soft', index)}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={tempSkill.soft}
                onChange={(e) => setTempSkill((prev: any) => ({ ...prev, soft: e.target.value }))}
                className="w-full p-2 border rounded-md"
                placeholder="Add soft skill"
              />
              <button
                onClick={() => {
                  addSkill('soft', tempSkill.soft);
                  setTempSkill((prev: any) => ({ ...prev, soft: '' }));
                }}
                className="px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </div>
        </div>
        
        {/* Experience Section */}
        <div className="bg-white rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Experience</h2>
            <button
              onClick={() => setShowNewExperienceForm(!showNewExperienceForm)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Experience
            </button>
          </div>
          
          {/* Add new experience form - Moved inside the card */}
          {showNewExperienceForm && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium mb-3">
                {editingExperienceId !== null ? 'Edit Experience' : 'Add New Experience'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title/Position</label>
                  <input
                    type="text"
                    value={newExperience.title}
                    onChange={(e) => setNewExperience(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                    placeholder="e.g., Customer Service Representative"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={newExperience.company}
                    onChange={(e) => setNewExperience(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                    placeholder="e.g., ABC Corporation"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newExperience.startDate}
                    onChange={(e) => setNewExperience(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={newExperience.endDate}
                      onChange={(e) => setNewExperience(prev => ({ ...prev, endDate: e.target.value }))}
                      className="flex-1 p-2 border rounded-md"
                      disabled={newExperience.isPresent}
                    />
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={newExperience.isPresent}
                        onChange={(e) => setNewExperience(prev => ({ 
                          ...prev, 
                          isPresent: e.target.checked,
                          endDate: e.target.checked ? '' : prev.endDate 
                        }))}
                      />
                      Present
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
                {newExperience.responsibilities.map((responsibility, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={responsibility}
                      onChange={(e) => {
                        const updatedResponsibilities = [...newExperience.responsibilities];
                        updatedResponsibilities[index] = e.target.value;
                        setNewExperience(prev => ({ ...prev, responsibilities: updatedResponsibilities }));
                      }}
                      className="flex-1 p-2 border rounded-md"
                      placeholder={`Responsibility ${index + 1}`}
                    />
                    <button
                      onClick={() => {
                        if (newExperience.responsibilities.length > 1) {
                          const updatedResponsibilities = [...newExperience.responsibilities];
                          updatedResponsibilities.splice(index, 1);
                          setNewExperience(prev => ({ ...prev, responsibilities: updatedResponsibilities }));
                        }
                      }}
                      className="p-2 text-red-500 hover:text-red-700"
                      disabled={newExperience.responsibilities.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setNewExperience(prev => ({
                    ...prev,
                    responsibilities: [...prev.responsibilities, '']
                  }))}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mt-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Responsibility
                </button>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowNewExperienceForm(false);
                    setEditingExperienceId(null);
                    setNewExperience({
                      title: '',
                      company: '',
                      startDate: '',
                      endDate: '',
                      responsibilities: [''],
                      isPresent: false
                    });
                  }}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingExperienceId !== null) {
                      saveEditedExperience();
                    } else {
                      // Create formatted experience object
                      const newExp = {
                        title: newExperience.title,
                        company: newExperience.company,
                        startDate: newExperience.startDate,
                        endDate: newExperience.isPresent ? 'present' : newExperience.endDate,
                        responsibilities: newExperience.responsibilities.filter(r => r.trim())
                      };
                      
                      // Add to profile and update state
                      const updatedExperience = [...(profile.experience || []), newExp];
                      setProfile((prev: any) => ({
                        ...prev,
                        experience: updatedExperience
                      }));
                      
                      // Mark experience section as modified
                      setModifiedSections(prev => ({
                        ...prev,
                        experience: true
                      }));
                      
                      // Reset form
                      setShowNewExperienceForm(false);
                      setNewExperience({
                        title: '',
                        company: '',
                        startDate: '',
                        endDate: '',
                        responsibilities: [''],
                        isPresent: false
                      });
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={!newExperience.title || !newExperience.company || !newExperience.startDate || loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      Saving...
                    </>
                  ) : (
                    editingExperienceId !== null ? 'Save Changes' : 'Save Experience'
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* Experience List */}
          <div className="space-y-4">
            {profile.experience?.map((exp: any, index: number) => (
              <div key={index} className="border-l-2 border-blue-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800">{exp.title}</h3>
                    <p className="text-gray-600">{exp.company}</p>
                    <p className="text-sm text-gray-500">
                      {exp.startDate ? formatDate(exp.startDate) : 'N/A'} - {
                        exp.endDate === 'present' ? 'Present' : 
                        exp.endDate ? formatDate(exp.endDate) : 'N/A'
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditingExperience(index)}
                      className="p-1 text-blue-500 hover:text-blue-700"
                      title="Edit experience"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const updatedExperience = [...profile.experience];
                        updatedExperience.splice(index, 1);
                        setProfile((prev: any) => ({
                          ...prev,
                          experience: updatedExperience
                        }));
                        
                        // Mark experience section as modified
                        setModifiedSections(prev => ({
                          ...prev,
                          experience: true
                        }));
                      }}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Delete experience"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {exp.responsibilities?.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-gray-700">Responsibilities:</h4>
                    <ul className="list-disc pl-5 space-y-1 mt-1">
                      {exp.responsibilities.map((responsibility: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600">{responsibility}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            
            {(!profile.experience || profile.experience.length === 0) && (
              <p className="text-gray-500 italic text-center py-4">No experience entries yet</p>
            )}
          </div>
        </div>

        {/* Languages Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Languages</h2>
          
          {/* Current Languages */}
          <div className="space-y-2 mb-4">
            {profile.personalInfo?.languages?.map((lang: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{lang.language}</span>
                  <span className="ml-2 text-sm text-blue-600">({lang.proficiency})</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={lang.proficiency}
                    onChange={(e) => {
                      updateLanguageProficiency(index, e.target.value);
                      setModifiedSections(prev => ({
                        ...prev,
                        languages: true
                      }));
                    }}
                    className="text-sm p-1 border rounded"
                  >
                    {proficiencyLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => {
                      removeLanguage(index);
                      setModifiedSections(prev => ({
                        ...prev,
                        languages: true
                      }));
                    }}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Add Language Form */}
          <div className="mt-4">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tempLanguage.language}
                onChange={(e) => setTempLanguage((prev: any) => ({ ...prev, language: e.target.value }))}
                className="w-full p-2 border rounded-md"
                placeholder="Add language"
              />
              
              <select
                value={tempLanguage.proficiency}
                onChange={(e) => setTempLanguage((prev: any) => ({ ...prev, proficiency: e.target.value }))}
                className="w-24 p-2 border rounded-md"
              >
                {proficiencyLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.value}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={addLanguage}
              className="w-full py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center justify-center gap-1 transition-colors mb-4"
            >
              <Plus className="w-4 h-4" />
              Add Language
            </button>
            
            {renderError(validationErrors.languages, 'languages')}
          </div>
        </div>

        {/* Availability Section */}
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold">Availability</h2>
          </div>
          
          {/* Working Hours */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Working Hours</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start Time</label>
                <input
                  type="time"
                  value={profile.availability?.hours?.start || ''}
                  onChange={(e) => {
                    setProfile((prev: any) => ({
                      ...prev,
                      availability: {
                        ...prev.availability,
                        hours: {
                          ...(prev.availability?.hours || {}),
                          start: e.target.value
                        }
                      }
                    }));
                    setModifiedSections(prev => ({
                      ...prev,
                      availability: true
                    }));
                  }}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End Time</label>
                <input
                  type="time"
                  value={profile.availability?.hours?.end || ''}
                  onChange={(e) => {
                    setProfile((prev: any) => ({
                      ...prev,
                      availability: {
                        ...prev.availability,
                        hours: {
                          ...(prev.availability?.hours || {}),
                          end: e.target.value
                        }
                      }
                    }));
                    setModifiedSections(prev => ({
                      ...prev,
                      availability: true
                    }));
                  }}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
          </div>
          
          {/* Available Days */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Available Days</label>
            <div className="grid grid-cols-7 gap-1">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                const shortDay = day.substring(0, 3);
                const isSelected = profile.availability?.days?.includes(day);
                
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const currentDays = [...(profile.availability?.days || [])];
                      if (isSelected) {
                        // Remove day
                        const updatedDays = currentDays.filter(d => d !== day);
                        setProfile((prev: any) => ({
                          ...prev,
                          availability: {
                            ...prev.availability,
                            days: updatedDays
                          }
                        }));
                      } else {
                        // Add day
                        const updatedDays = [...currentDays, day];
                        setProfile((prev: any) => ({
                          ...prev,
                          availability: {
                            ...prev.availability,
                            days: updatedDays
                          }
                        }));
                      }
                    }}
                    className={`p-2 rounded-full w-10 h-10 flex items-center justify-center text-sm ${
                      isSelected
                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                    }`}
                  >
                    {shortDay}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Time Zones */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Zones</label>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  const currentTimeZones = [...(profile.availability?.timeZones || [])];
                  if (!currentTimeZones.includes(e.target.value)) {
                    const updatedTimeZones = [...currentTimeZones, e.target.value];
                    setProfile((prev: any) => ({
                      ...prev,
                      availability: {
                        ...prev.availability,
                        timeZones: updatedTimeZones
                      }
                    }));
                  }
                  e.target.value = '';
                }
              }}
              className="w-full p-2 border rounded-md mb-2"
            >
              <option value="">Add a time zone...</option>
              <option value="UTC">UTC - Coordinated Universal Time</option>
              <option value="EST">EST - Eastern Standard Time</option>
              <option value="CST">CST - Central Standard Time</option>
              <option value="MST">MST - Mountain Standard Time</option>
              <option value="PST">PST - Pacific Standard Time</option>
              <option value="GMT">GMT - Greenwich Mean Time</option>
              <option value="CET">CET - Central European Time</option>
              <option value="IST">IST - Indian Standard Time</option>
              <option value="JST">JST - Japan Standard Time</option>
              <option value="AEST">AEST - Australian Eastern Standard Time</option>
            </select>
            
            <div className="flex flex-wrap gap-2">
              {profile.availability?.timeZones?.map((zone: string, idx: number) => (
                <div key={idx} className="flex items-center bg-blue-50 px-2 py-1 rounded text-sm">
                  <span className="text-blue-800">{zone}</span>
                  <button
                    onClick={() => {
                      const updatedTimeZones = [...(profile.availability?.timeZones || [])];
                      updatedTimeZones.splice(idx, 1);
                      setProfile((prev: any) => ({
                        ...prev,
                        availability: {
                          ...prev.availability,
                          timeZones: updatedTimeZones
                        }
                      }));
                    }}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Flexibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Flexibility Options</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempFlexibility || ''}
                  onChange={(e) => setTempFlexibility(e.target.value)}
                  className="flex-1 p-2 border rounded-md"
                  placeholder="Add flexibility option"
                />
                <button
                  onClick={() => {
                    if (tempFlexibility?.trim()) {
                      const updatedFlexibility = [...(profile.availability?.flexibility || []), tempFlexibility.trim()];
                      setProfile((prev: any) => ({
                        ...prev,
                        availability: {
                          ...prev.availability,
                          flexibility: updatedFlexibility
                        }
                      }));
                      // Mark availability section as modified
                      setModifiedSections(prev => ({
                        ...prev,
                        availability: true
                      }));
                      setTempFlexibility('');
                    }
                  }}
                  className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"
                >
                  Add
                </button>
              </div>
              
              {profile.availability?.flexibility?.length > 0 ? (
                <ul className="space-y-1">
                  {profile.availability.flexibility.map((item: string, idx: number) => (
                    <li key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{item}</span>
                      <button
                        onClick={() => {
                          const updatedFlexibility = [...profile.availability.flexibility];
                          updatedFlexibility.splice(idx, 1);
                          setProfile((prev: any) => ({
                            ...prev,
                            availability: {
                              ...prev.availability,
                              flexibility: updatedFlexibility
                            }
                          }));
                          // Mark availability section as modified
                          setModifiedSections(prev => ({
                            ...prev,
                            availability: true
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm italic">No flexibility options specified</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transition-all transform duration-500 ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {toast.type === 'success' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}; 