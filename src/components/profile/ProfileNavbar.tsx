import React from 'react';
import { User, Zap, Briefcase, Globe, ClipboardCheck } from 'lucide-react';

interface ProfileNavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const ProfileNavbar: React.FC<ProfileNavbarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'skills', label: 'Skills', icon: Zap },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'languages', label: 'Languages', icon: Globe },
    { id: 'onboarding', label: 'Onboarding', icon: ClipboardCheck },
  ];

  return (
    <div className="sticky top-0 z-30 mb-6 py-2 bg-gray-50/80 backdrop-blur-md">
      <nav className="flex items-center gap-1 p-1.5 bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};
