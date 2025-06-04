import React, { useState, useEffect, useRef } from 'react';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { 
  MapPin, Mail, Phone, Linkedin, Github, Target, Clock, Briefcase, 
  Calendar, GraduationCap, Medal, Star, ThumbsUp, ThumbsDown, Trophy,
  Edit, Check, X, Save, RefreshCw, Plus, Trash2, Camera, Upload
} from 'lucide-react';
import { updateProfileData, updateBasicInfo, updateExperience, updateSkills } from '../utils/profileUtils';
import { getLanguageCodeFromAI } from '../utils/languageUtils';
import OpenAI from 'openai';

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

// Define proper types
interface Profile {
  _id: string;
  personalInfo: {
    profileImage?: string;
    photo?: {
      url: string;
      publicId: string;
    };
    name?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface PhotoUploadResponse {
  photoUrl: string;
  publicId: string;
  [key: string]: any;
}

// Modified uploadPhoto function with token
const uploadPhoto = async (agentId: string, photoFile: Blob): Promise<PhotoUploadResponse> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const formData = new FormData();
  formData.append('photo', photoFile);

  try {
    const response = await fetch(`${import.meta.env.VITE_REP_API_URL}/api/profiles/${agentId}/photo`, {
      method: 'PUT',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const updatedProfile = await response.json();
    return updatedProfile;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

// Function to convert base64 to blob
const base64ToBlob = async (base64String: string): Promise<Blob> => {
  // Remove data URL prefix if present
  const base64WithoutPrefix = base64String.split(',')[1] || base64String;
  
  // Decode base64
  const byteString = atob(base64WithoutPrefix);
  
  // Create an array buffer from the decoded string
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  // Create blob from array buffer
  return new Blob([ab], { type: 'image/jpeg' });
};

export const ProfileEditView: React.FC<ProfileEditViewProps> = ({ profile: initialProfile, onSave }) => {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [tempProfileDescription, setTempProfileDescription] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track which sections have been modified
  const [modifiedSections, setModifiedSections] = useState({
    personalInfo: false,
    professionalSummary: false,
    skills: false,
    experience: false,
    languages: false,
    availability: false,
    profileImage: false
  });
  
  // Additional state for editing
  const [tempLanguage, setTempLanguage] = useState({ language: '', proficiency: 'B1', iso639_1: '' });
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

  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    x: 5,
    y: 5,
    height: 90
  });
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageToShow, setImageToShow] = useState<string | null>(null);

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

  // Add function to fetch updated profile data
  const refreshProfileData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${import.meta.env.VITE_REP_API_URL}/api/profiles/${profile._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('Error refreshing profile data:', error);
      throw error;
    }
  };

  // Modified handleSave to refresh data after successful save
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
      // Handle photo upload first if modified
      if (modifiedSections.profileImage && imagePreview) {
        try {
          setUploadingPhoto(true);
          console.log('📸 Uploading new profile photo...');
          
          const photoBlob = await base64ToBlob(imagePreview);
          const photoResult = await uploadPhoto(profile._id, photoBlob);
          
          console.log('✅ Photo uploaded successfully');
        } catch (error) {
          console.error('❌ Error uploading photo:', error);
          if (error instanceof Error && error.message === 'No authentication token found') {
            showToast('Please log in again to upload photo', 'error');
          } else {
            showToast('Failed to upload profile photo', 'error');
          }
          return;
        } finally {
          setUploadingPhoto(false);
        }
      }

      // Continue with other profile updates
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

      // After all updates are done, refresh the profile data
      const updatedProfile = await refreshProfileData();
      
      // Reset modified sections
      setModifiedSections({
        personalInfo: false,
        professionalSummary: false,
        skills: false,
        experience: false,
        languages: false,
        availability: false,
        profileImage: false
      });

      console.log('✅ All changes saved successfully');
      showToast('Profile saved successfully', 'success');
      onSave(updatedProfile);
    } catch (error) {
      console.error('❌ Error saving profile:', error);
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
    
    setProfile((prev: Profile) => ({
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
  const addLanguage = async () => {
    if (!tempLanguage.language.trim()) {
      setValidationErrors((prev: Record<string, string>) => ({
        ...prev,
        languages: 'Language name is required'
      }));
      return;
    }

    try {
      setLoading(true);
      
      // Get the OpenAI API key from environment variables
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is required');
      }

      // Create OpenAI client
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      // Get language code using AI
      const iso639_1 = await getLanguageCodeFromAI(tempLanguage.language, openai);
      
      const languageWithCode = {
        ...tempLanguage,
        iso639_1: iso639_1
      };
      
      const updatedLanguages = [
        ...(profile.personalInfo.languages || []),
        languageWithCode
      ];
      
      // Update local state
      setProfile((prev: Profile) => ({
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
      setTempLanguage({ language: '', proficiency: 'B1', iso639_1: '' });
      
      showToast('Language added successfully', 'success');
    } catch (error) {
      console.error('Error adding language:', error);
      showToast('Failed to add language', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Remove language from profile
  const removeLanguage = (index: number) => {
    const updatedLanguages = profile.personalInfo.languages.filter((_: any, i: number) => i !== index);
    
    // Update local state
    setProfile((prev: Profile) => ({
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
    setProfile((prev: Profile) => ({
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
      
      setProfile((prev: Profile) => ({
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
    
    setProfile((prev: Profile) => ({
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

      setProfile((prev: Profile) => ({
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

  // Function to calculate scaled dimensions
  const calculateScaledDimensions = (originalWidth: number, originalHeight: number) => {
    const maxWidth = Math.min(window.innerWidth * 0.8, 800); // 80% of viewport width or 800px max
    const maxHeight = Math.min(window.innerHeight * 0.6, 600); // 60% of viewport height or 600px max
    
    let newWidth = originalWidth;
    let newHeight = originalHeight;
    
    // Scale down if width exceeds maxWidth
    if (newWidth > maxWidth) {
      newHeight = (maxWidth * newHeight) / newWidth;
      newWidth = maxWidth;
    }
    
    // Scale down further if height still exceeds maxHeight
    if (newHeight > maxHeight) {
      newWidth = (maxHeight * newWidth) / newHeight;
      newHeight = maxHeight;
    }
    
    return {
      width: Math.floor(newWidth),
      height: Math.floor(newHeight)
    };
  };

  // Modified handleImageChange
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showToast('Image size should be less than 10MB', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const scaledDimensions = calculateScaledDimensions(img.width, img.height);
          setImageDimensions(scaledDimensions);
          setTempImage(reader.result as string);
          setShowCropModal(true);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Modified handleCropComplete to handle image format
  const handleCropComplete = () => {
    if (imageRef.current && crop.width && crop.height) {
      const croppedImageUrl = getCroppedImg(imageRef.current, crop);
      setImagePreview(croppedImageUrl);
      setShowCropModal(false);
      setTempImage(null);
      setModifiedSections(prev => ({
        ...prev,
        profileImage: true
      }));
    }
  };

  // Function to get cropped image
  const getCroppedImg = (image: HTMLImageElement, crop: Crop): string => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width!;
    canvas.height = crop.height!;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(
        image,
        crop.x! * scaleX,
        crop.y! * scaleY,
        crop.width! * scaleX,
        crop.height! * scaleY,
        0,
        0,
        crop.width!,
        crop.height!
      );
    }

    return canvas.toDataURL('image/jpeg');
  };

  // Modified handleRemoveImage to handle publicId
  const handleRemoveImage = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Only make API call if there's an existing photo with publicId
      if (profile.personalInfo?.photo?.publicId) {
        const response = await fetch(`${import.meta.env.VITE_REP_API_URL}/api/profiles/${profile._id}/photo`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            publicId: profile.personalInfo.photo.publicId
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setModifiedSections(prev => ({
        ...prev,
        profileImage: true
      }));

      // Refresh profile data to get updated state
      await refreshProfileData();
      showToast('Profile photo removed successfully', 'success');
    } catch (error) {
      console.error('Error removing profile photo:', error);
      showToast('Failed to remove profile photo', 'error');
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
            disabled={loading || uploadingPhoto}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || uploadingPhoto ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {uploadingPhoto ? 'Uploading Photo...' : 'Saving...'}
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
            <div className="mb-6 relative">
              <div 
                className="w-32 h-32 rounded-full mx-auto shadow-lg border-4 border-white bg-gray-300 overflow-hidden relative group cursor-pointer"
                title={profile.personalInfo?.photo?.publicId ? `Photo ID: ${profile.personalInfo.photo.publicId}` : ''}
                onClick={() => {
                  const imageUrl = imagePreview || profile.personalInfo?.photo?.url;
                  if (imageUrl) {
                    setImageToShow(imageUrl);
                    setShowImageModal(true);
                  }
                }}
              >
                {(imagePreview || profile.personalInfo?.photo?.url) ? (
                  <img 
                    src={imagePreview || profile.personalInfo?.photo?.url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                    {profile.personalInfo?.name?.charAt(0) || '?'}
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100"
                    title="Upload new photo"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  {(imagePreview || profile.personalInfo?.photo?.url) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                      className="p-2 bg-white rounded-full text-red-600 hover:bg-gray-100 ml-2"
                      title="Remove photo"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <p className="text-sm text-gray-500 mt-2">
                Click to upload profile picture
                <br />
                (Max size: 10MB)
              </p>
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
                  setProfile((prev: Profile) => ({
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
        {/* About Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">About</h2>
          
          {/* Profile Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={profile.professionalSummary?.profileDescription || ''}
              onChange={(e) => {
                setProfile((prev: Profile) => ({
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
              placeholder="Tell us about yourself, your background, and your expertise..."
            />
          </div>
        </div>

        {/* Years of Experience Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Years of Experience</h2>
          <div className="mb-4">
            <input
              type="text"
              value={profile.professionalSummary?.yearsOfExperience || ''}
              onChange={(e) => {
                setProfile((prev: Profile) => ({
                  ...prev,
                  professionalSummary: {
                    ...prev.professionalSummary,
                    yearsOfExperience: e.target.value
                  }
                }));
                setModifiedSections(prev => ({
                  ...prev,
                  professionalSummary: true
                }));
              }}
              className="w-full p-2 border rounded-md"
              placeholder="e.g., 5"
            />
          </div>
        </div>
          
        {/* Industries Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Industries</h2>
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.professionalSummary?.industries?.map((industry: string, index: number) => (
              <div key={index} className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                <span className="text-blue-800 text-sm">{industry}</span>
                <button
                  onClick={() => {
                    const updatedIndustries = [...(profile.professionalSummary?.industries || [])];
                    updatedIndustries.splice(index, 1);
                    setProfile((prev: Profile) => ({
                      ...prev,
                      professionalSummary: {
                        ...prev.professionalSummary,
                        industries: updatedIndustries
                      }
                    }));
                    setModifiedSections(prev => ({
                      ...prev,
                      professionalSummary: true
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
                  setProfile((prev: Profile) => ({
                    ...prev,
                    professionalSummary: {
                      ...prev.professionalSummary,
                      industries: updatedIndustries
                    }
                  }));
                  setModifiedSections(prev => ({
                    ...prev,
                    professionalSummary: true
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

        {/* Notable Companies Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Notable Companies</h2>
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.professionalSummary?.notableCompanies?.map((company: string, index: number) => (
              <div key={index} className="flex items-center bg-purple-50 px-3 py-1 rounded-full">
                <span className="text-purple-800 text-sm">{company}</span>
                <button
                  onClick={() => {
                    const updatedCompanies = [...(profile.professionalSummary?.notableCompanies || [])];
                    updatedCompanies.splice(index, 1);
                    setProfile((prev: Profile) => ({
                      ...prev,
                      professionalSummary: {
                        ...prev.professionalSummary,
                        notableCompanies: updatedCompanies
                      }
                    }));
                    setModifiedSections(prev => ({
                      ...prev,
                      professionalSummary: true
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
                  setProfile((prev: Profile) => ({
                    ...prev,
                    professionalSummary: {
                      ...prev.professionalSummary,
                      notableCompanies: updatedCompanies
                    }
                  }));
                  setModifiedSections(prev => ({
                    ...prev,
                    professionalSummary: true
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
                    className="flex-1 p-2 border rounded-md"
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
                      setProfile((prev: Profile) => ({
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
                        setProfile((prev: Profile) => ({
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
                  <span className="font-medium">
                    {lang.language}
                    {lang.iso639_1 && <span className="text-gray-500 ml-1">({lang.iso639_1})</span>}
                  </span>
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
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Working Hours</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start Time</label>
                <input
                  type="time"
                  value={profile.availability?.hours?.start || ''}
                  onChange={(e) => {
                    setProfile((prev: Profile) => ({
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
                    setProfile((prev: Profile) => ({
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
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Available Days</label>
            <div className="flex flex-wrap gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                const isSelected = profile.availability?.days?.includes(day);
                
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const currentDays = [...(profile.availability?.days || [])];
                      if (isSelected) {
                        const updatedDays = currentDays.filter(d => d !== day);
                        setProfile((prev: Profile) => ({
                          ...prev,
                          availability: {
                            ...prev.availability,
                            days: updatedDays
                          }
                        }));
                      } else {
                        const updatedDays = [...currentDays, day];
                        setProfile((prev: Profile) => ({
                          ...prev,
                          availability: {
                            ...prev.availability,
                            days: updatedDays
                          }
                        }));
                      }
                      setModifiedSections(prev => ({
                        ...prev,
                        availability: true
                      }));
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Zones</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'UTC - Coordinated Universal Time',
                'EST - Eastern Standard Time',
                'CST - Central Standard Time',
                'MST - Mountain Standard Time',
                'PST - Pacific Standard Time',
                'GMT - Greenwich Mean Time',
                'CET - Central European Time',
                'IST - Indian Standard Time',
                'JST - Japan Standard Time',
                'AEST - Australian Eastern Standard Time'
              ].map((zone) => {
                const zoneCode = zone.split(' - ')[0];
                const isSelected = profile.availability?.timeZones?.includes(zoneCode);
                
                return (
                  <button
                    key={zone}
                    onClick={() => {
                      const currentZones = [...(profile.availability?.timeZones || [])];
                      if (isSelected) {
                        const updatedZones = currentZones.filter(z => z !== zoneCode);
                        setProfile((prev: Profile) => ({
                          ...prev,
                          availability: {
                            ...prev.availability,
                            timeZones: updatedZones
                          }
                        }));
                      } else {
                        const updatedZones = [...currentZones, zoneCode];
                        setProfile((prev: Profile) => ({
                          ...prev,
                          availability: {
                            ...prev.availability,
                            timeZones: updatedZones
                          }
                        }));
                      }
                      setModifiedSections(prev => ({
                        ...prev,
                        availability: true
                      }));
                    }}
                    className={`p-2 rounded-lg text-sm font-medium text-left transition-colors duration-200 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {zone}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Flexibility</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Remote Work Available',
                'Flexible Hours',
                'Weekend Rotation',
                'Night Shift Available',
                'Split Shifts',
                'Part-Time Options',
                'Compressed Work Week',
                'Shift Swapping Allowed',
                'On-Call Available',
                'Holiday Coverage',
                'Emergency Response',
                'Seasonal Flexibility'
              ].map((option) => {
                const isSelected = profile.availability?.flexibility?.includes(option);
                
                return (
                  <button
                    key={option}
                    onClick={() => {
                      const currentFlexibility = [...(profile.availability?.flexibility || [])];
                      if (isSelected) {
                        const updatedFlexibility = currentFlexibility.filter(f => f !== option);
                        setProfile((prev: Profile) => ({
                          ...prev,
                          availability: {
                            ...prev.availability,
                            flexibility: updatedFlexibility
                          }
                        }));
                      } else {
                        const updatedFlexibility = [...currentFlexibility, option];
                        setProfile((prev: Profile) => ({
                          ...prev,
                          availability: {
                            ...prev.availability,
                            flexibility: updatedFlexibility
                          }
                        }));
                      }
                      setModifiedSections(prev => ({
                        ...prev,
                        availability: true
                      }));
                    }}
                    className={`p-2 rounded-lg text-sm font-medium text-left transition-colors duration-200 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {showCropModal && tempImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6" style={{ width: `${imageDimensions.width + 48}px` }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Crop Profile Picture</h3>
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setTempImage(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex items-center justify-center">
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imageRef}
                  src={tempImage}
                  alt="Crop preview"
                  style={{
                    width: `${imageDimensions.width}px`,
                    height: `${imageDimensions.height}px`,
                    objectFit: 'contain'
                  }}
                />
              </ReactCrop>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setTempImage(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCropComplete}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && imageToShow && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowImageModal(false);
            setImageToShow(null);
          }}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg p-2 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 p-2 bg-white rounded-full text-gray-600 hover:text-gray-900 shadow-lg z-10"
              onClick={() => {
                setShowImageModal(false);
                setImageToShow(null);
              }}
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={imageToShow}
              alt={profile.personalInfo?.name || 'Profile'}
              className="w-full h-full object-contain rounded-lg"
              style={{ maxHeight: 'calc(90vh - 2rem)' }}
            />
            {profile.personalInfo?.photo?.publicId && !imagePreview && (
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                ID: {profile.personalInfo.photo.publicId}
              </div>
            )}
          </div>
        </div>
      )}

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