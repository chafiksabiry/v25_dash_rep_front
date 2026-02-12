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
      isAccessible: () => isPhaseCompleted(5)
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
    <div className="w-64 bg-white border-r border-gray-200">
      <div className="h-16 flex items-center justify-center border-b border-gray-200">
        <img
          src={`${import.meta.env.VITE_FRONT_URL}logo_harx.jpg`}
          alt="HARX.AI Logo"
          className="h-8 w-auto object-contain"
        />
      </div>
      <nav className="mt-6">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : ''
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={logout}
          className="w-full flex items-center px-6 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors mt-auto"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}