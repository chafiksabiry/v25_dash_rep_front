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
    <div className="w-64 bg-white border-r border-gray-100 flex flex-col">
      <div className="h-20 flex items-center justify-center border-b border-gray-50">
        <img
          src={`${import.meta.env.VITE_FRONT_URL}logo_harx.jpg`}
          alt="HARX.AI Logo"
          className="h-10 w-auto object-contain"
          onError={(e) => {
            // Fallback to a text logo if image fails
            (e.target as any).src = 'https://harx25pageslinks.netlify.app/logo_harx.jpg';
          }}
        />
      </div>
      <nav className="flex-1 mt-6 px-3">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 mb-1 rounded-xl font-medium transition-all group ${isActive
                ? 'bg-harx-pink/10 text-harx-pink shadow-sm'
                : 'text-slate-500 hover:bg-gray-50 hover:text-slate-900'
              }`
            }
          >
            <item.icon className={`w-5 h-5 mr-3 transition-colors ${(({ isActive }: any) => isActive ? 'text-harx-pink' : 'text-slate-400 group-hover:text-slate-600') as any}`} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={logout}
          className="w-full flex items-center px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}