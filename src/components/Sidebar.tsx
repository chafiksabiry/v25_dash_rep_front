import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, UserCircle, LogOut, Settings, Monitor, Users, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Declare qiankun global variables
declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
    __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string;
  }
}

interface Phase {
  status: string;
  completedAt?: string;
  requiredActions?: any[];
  optionalActions?: any[];
}

interface Phases {
  phase1: Phase;
  phase2: Phase;
  phase3: Phase;
  phase4: Phase;
  phase5: Phase;
}

interface SidebarProps {
  phases: Phases | undefined;
}

export function Sidebar({ phases }: SidebarProps) {
  const { logout } = useAuth();

  const isPhaseCompleted = (phaseNumber: number): boolean => {
    if (!phases) return false;
    return phases[`phase${phaseNumber}` as keyof Phases]?.status === 'completed';
  };

  const navItems = [
    {
      icon: UserCircle,
      label: 'Profile',
      path: '/profile',
      isAccessible: () => true // Always accessible
    },
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/dashboard',
      isAccessible: () => isPhaseCompleted(5)
    },
    {
      icon: Briefcase,
      label: 'Marketplace',
      path: '/gigs-marketplace',
      isAccessible: () => isPhaseCompleted(4)
    },
    {
      icon: Monitor,
      label: 'Workspace',
      path: '/workspace',
      isAccessible: () => isPhaseCompleted(4)
    },
    {
      icon: Calendar,
      label: 'Session Planning',
      path: '/session-planning',
      isAccessible: () => true // Temporarily enabled for testing
    },
    {
      icon: Users,
      label: 'Leads',
      path: '/import-leads',
      isAccessible: () => isPhaseCompleted(5)
    },
    {
      icon: Settings,
      label: 'Operations',
      path: '/operations',
      isAccessible: () => isPhaseCompleted(5)
    },
  ];

  const filteredNavItems = navItems.filter(item => item.isAccessible());

  useEffect(() => {
    console.log('🔒 Access Control Status:', {
      phases,
      availableNavItems: filteredNavItems.map(item => item.label),
      restrictedNavItems: navItems
        .filter(item => !item.isAccessible())
        .map(item => item.label)
    });
  }, [phases]);

  return (
    <div className="w-72 fixed inset-y-0 left-0 z-30 bg-[#0a0b14] text-white transition-all duration-300 md:relative shadow-2xl border-r border-white/5 flex flex-col overflow-y-auto">
      <div className="h-24 flex items-center justify-center border-b border-white/5">
        <img
          src={`${import.meta.env.VITE_FRONT_URL && !import.meta.env.VITE_FRONT_URL.endsWith('/') ? import.meta.env.VITE_FRONT_URL + '/' : import.meta.env.VITE_FRONT_URL || ''}logo_harx.png`}
          alt="HARX.AI Logo"
          className="h-10 w-auto object-contain"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = `${import.meta.env.VITE_FRONT_URL && !import.meta.env.VITE_FRONT_URL.endsWith('/') ? import.meta.env.VITE_FRONT_URL + '/' : import.meta.env.VITE_FRONT_URL || ''}logo_harx.jpg`;
          }}
        />
      </div>

      <nav className="flex-1 px-4 flex flex-col min-h-0 space-y-1">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex w-full items-center space-x-3 rounded-2xl py-3 px-5 transition-all duration-300 group ${
                isActive
                  ? 'bg-gradient-harx text-white shadow-xl shadow-harx-500/25 ring-1 ring-white/10'
                  : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-2 rounded-xl transition-all shrink-0 ${isActive ? 'bg-white/20' : 'bg-gray-800/40 group-hover:bg-gray-800'}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="font-black text-sm tracking-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 bg-black/40 border-t border-white/5 mt-auto">
        <button
          onClick={logout}
          className="flex w-full items-center space-x-3 rounded-xl py-2 px-4 text-gray-400 hover:bg-harx-600/20 hover:text-harx-400 transition-all duration-300 group font-bold text-sm"
        >
          <div className="p-2 rounded-lg bg-gray-800/50 group-hover:bg-harx-500/20 transition-colors">
            <LogOut className="h-4 w-4" />
          </div>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}