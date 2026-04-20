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
    <div className="flex items-center gap-1 bg-white p-1.5 rounded-3xl border border-gray-100 shadow-sm mb-8 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all whitespace-nowrap
              ${isActive 
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}
            `}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-harx-400' : ''}`} />
            <span className="uppercase tracking-widest text-[11px]">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
