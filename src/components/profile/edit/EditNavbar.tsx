import React from 'react';
import { User, ShieldCheck, Briefcase, Globe, Clock } from 'lucide-react';

interface EditNavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const EditNavbar: React.FC<EditNavbarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'skills', label: 'Skills', icon: ShieldCheck },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'languages', label: 'Languages', icon: Globe },
    { id: 'availability', label: 'Availability', icon: Clock },
  ];

  return (
    <div className="flex items-center border-b border-gray-100 mb-8 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all whitespace-nowrap
              ${isActive 
                ? 'text-harx-600' 
                : 'text-gray-400 hover:text-gray-600'}
            `}
          >
            <span className="tracking-tight">{tab.label}</span>
            
            {/* Active Underline - Twilio Style */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-harx-600 animate-in fade-in slide-in-from-bottom-1" />
            )}
          </button>
        );
      })}
    </div>
  );
};
