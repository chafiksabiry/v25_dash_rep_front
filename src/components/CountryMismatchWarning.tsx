import React from 'react';
import { Timezone } from '../services/api/repWizard';

interface CountryMismatchWarningProps {
  detectedCountryCode: string;
  countries: Timezone[];
}

export const CountryMismatchWarning: React.FC<CountryMismatchWarningProps> = ({ 
  detectedCountryCode, 
  countries 
}) => {
  // Find the country name from the countries list using the detected country code
  const detectedCountry = countries.find(country => country.countryCode === detectedCountryCode);
  const detectedCountryName = detectedCountry?.countryName || detectedCountryCode;

  return (
    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
            <path 
              fillRule="evenodd" 
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-amber-800">
            <strong>Country Mismatch Detected</strong> - Your profile country differs from what we detected based on your IP address ({detectedCountryName}). This may be due to VPN usage or if you've moved to a different country.
          </p>
        </div>
      </div>
    </div>
  );
}; 