import React from 'react';
import { MapPin, Mail, Phone, Camera, Trash2, RefreshCw } from 'lucide-react';
import { Timezone } from '../../../services/api/repWizard';

interface EditSidebarProps {
  profile: any;
  handleProfileChange: (field: string, value: any) => void;
  validationErrors: Record<string, string>;
  renderError: (error: string | undefined, id: string) => React.ReactNode;
  
  // Photo Props
  imagePreview: string | null;
  isPhotoMarkedForDeletion: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: () => void;
  setImageToShow: (url: string) => void;
  setShowImageModal: (show: boolean) => void;

  // Country Props
  countrySearchTerm: string;
  setCountrySearchTerm: (term: string) => void;
  isCountryDropdownOpen: boolean;
  setIsCountryDropdownOpen: (open: boolean) => void;
  filteredCountries: Timezone[];
  setSelectedCountry: (code: string) => void;
  selectedCountryIndex: number;
  setSelectedCountryIndex: (index: number | ((prev: number) => number)) => void;
  
  // Loading states
  checkingCountryMismatch: boolean;
  showLoadingSpinner: boolean;
  countryMismatch: any;
}

export const EditSidebar: React.FC<EditSidebarProps> = ({
  profile,
  handleProfileChange,
  validationErrors,
  renderError,
  imagePreview,
  isPhotoMarkedForDeletion,
  fileInputRef,
  handleImageChange,
  handleRemoveImage,
  setImageToShow,
  setShowImageModal,
  countrySearchTerm,
  setCountrySearchTerm,
  isCountryDropdownOpen,
  setIsCountryDropdownOpen,
  filteredCountries,
  setSelectedCountry,
  selectedCountryIndex,
  setSelectedCountryIndex,
  checkingCountryMismatch,
  showLoadingSpinner,
  countryMismatch
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="text-center">
          {/* Photo Section */}
          <div className="mb-6 relative group">
            <div 
              className="w-32 h-32 rounded-full mx-auto shadow-lg border-4 border-white bg-gray-50 overflow-hidden relative cursor-pointer"
              onClick={() => {
                const imageUrl = imagePreview || profile.personalInfo?.photo?.url;
                if (!isPhotoMarkedForDeletion && imageUrl) {
                  setImageToShow(imageUrl);
                  setShowImageModal(true);
                } else {
                  fileInputRef.current?.click();
                }
              }}
            >
              {!isPhotoMarkedForDeletion && (imagePreview || profile.personalInfo?.photo?.url) ? (
                <img 
                  src={imagePreview || profile.personalInfo?.photo?.url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-gray-200 bg-gray-50">
                  {profile.personalInfo?.name?.charAt(0) || '?'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                <Camera className="text-white w-8 h-8" />
              </div>
            </div>
            
            {(imagePreview || profile.personalInfo?.photo?.url) && !isPhotoMarkedForDeletion && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                className="absolute -top-1 right-1/4 p-2 bg-white text-rose-500 rounded-full shadow-md border border-gray-100 hover:bg-rose-50 transition-colors"
                title="Remove photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
          
          {/* Identity Fields */}
          <div className="space-y-4 text-left">
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Full Name</label>
              <input
                type="text"
                value={profile.personalInfo?.name || ''}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-harx-500/20 focus:border-harx-500 transition-all outline-none"
                placeholder="Ex: John Doe"
              />
              {renderError(validationErrors.name, 'name')}
            </div>
            
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Current Role</label>
              <input
                type="text"
                value={profile.professionalSummary?.currentRole || ''}
                onChange={(e) => handleProfileChange('currentRole', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-harx-500/20 focus:border-harx-500 transition-all outline-none"
                placeholder="Ex: Senior Sales Rep"
              />
            </div>
            
            {/* Country Dropdown */}
            <div className="relative">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Country</label>
              <div className="relative">
                <input
                  type="text"
                  value={countrySearchTerm || (profile.personalInfo?.country?.countryName || '')}
                  onChange={(e) => {
                    setCountrySearchTerm(e.target.value);
                    setIsCountryDropdownOpen(true);
                    setSelectedCountryIndex(-1);
                    if (e.target.value === '') {
                      setSelectedCountry('');
                      handleProfileChange('country', '');
                    }
                  }}
                  onFocus={() => setIsCountryDropdownOpen(true)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-harx-500/20 focus:border-harx-500 transition-all outline-none"
                  placeholder="Search country..."
                />
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>

              {isCountryDropdownOpen && (
                <div className="absolute z-[60] w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-auto scrollbar-hide py-2">
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map((country, index) => (
                      <button
                        key={country.countryCode}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(country.countryCode);
                          setCountrySearchTerm(country.countryName);
                          setIsCountryDropdownOpen(false);
                          handleProfileChange('country', country._id);
                        }}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-sm transition-colors ${
                          index === selectedCountryIndex ? 'bg-harx-50 text-harx-600' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold">{country.countryName}</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase">{country.countryCode}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-xs font-bold text-gray-400 italic">No results found</div>
                  )}
                </div>
              )}
              {renderError(validationErrors.country, 'country')}
            </div>

            {/* Verification Alerts */}
            {countryMismatch?.hasMismatch && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                <p className="text-[10px] font-bold text-amber-800 leading-relaxed">
                  <span className="uppercase mr-1">Note:</span> Login location ({countryMismatch.firstLoginCountry}) doesn't match selected profile country.
                </p>
              </div>
            )}
            
            {checkingCountryMismatch && showLoadingSpinner && (
              <div className="flex items-center gap-2 px-1">
                <RefreshCw className="w-3 h-3 text-harx-500 animate-spin" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Validating Location...</span>
              </div>
            )}

            {/* Contact Details */}
            <div className="pt-2 space-y-4">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={profile.personalInfo?.email || ''}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-harx-500/20 focus:border-harx-500 transition-all outline-none"
                    placeholder="john@example.com"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {renderError(validationErrors.email, 'email')}
              </div>
              
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={profile.personalInfo?.phone || ''}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-harx-500/20 focus:border-harx-500 transition-all outline-none"
                    placeholder="+1 234 567 890"
                  />
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {renderError(validationErrors.phone, 'phone')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
