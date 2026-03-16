import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, UserCircle, LogOut, Settings, Monitor, Users, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

export function Sidebar({ phases, isSidebarOpen, setIsSidebarOpen, isCollapsed, setIsCollapsed }: SidebarProps) {
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
    <div 
      className={`fixed inset-y-0 left-0 z-30 bg-gradient-to-b from-[#0f111a] to-[#150a11] text-white transition-all duration-300 ease-in-out md:relative shadow-2xl border-r border-white/10 flex flex-col overflow-visible ${
        !isSidebarOpen
          ? '-translate-x-full md:translate-x-0'
          : 'translate-x-0'
      } ${isCollapsed ? 'w-20' : 'w-72'}`}
    >
      {/* Toggle Button - Modern Floating Style */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-12 bg-harx-500 text-white rounded-full p-1.5 shadow-lg shadow-harx-500/30 hover:scale-110 active:scale-95 transition-all z-[60] hidden md:flex"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`h-[90px] flex items-center justify-between border-b border-white/5 bg-[#0a0b14]/50 backdrop-blur-sm transition-all duration-300 ${isCollapsed ? 'px-4 justify-center' : 'px-6'}`}>
        <div className="flex items-center space-x-3.5">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-harx-500/40 to-harx-600/40 blur-md rounded-lg scale-90"></div>
            <img
              src={`${import.meta.env.VITE_FRONT_URL && !import.meta.env.VITE_FRONT_URL.endsWith('/') ? import.meta.env.VITE_FRONT_URL + '/' : import.meta.env.VITE_FRONT_URL || ''}logo_harx.png`}
              alt="HARX Logo"
              className="h-11 w-11 object-contain relative z-10 rounded-lg shadow-xl border border-white/10"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `${import.meta.env.VITE_FRONT_URL && !import.meta.env.VITE_FRONT_URL.endsWith('/') ? import.meta.env.VITE_FRONT_URL + '/' : import.meta.env.VITE_FRONT_URL || ''}logo_harx.jpg`;
              }}
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col justify-center overflow-hidden">
              <span className="text-[11px] font-black text-transparent bg-clip-text bg-gradient-to-r from-harx-400 to-harx-600 tracking-[0.25em] uppercase leading-none mb-1">
                HARX
              </span>
              <span className="text-xl font-black text-white tracking-tight uppercase leading-none whitespace-nowrap">
                Dashboard
              </span>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 flex flex-col min-h-0 space-y-2">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex w-full items-center rounded-2xl transition-all duration-300 group relative ${
                isCollapsed ? 'justify-center p-3' : 'space-x-3 py-3 px-5'
              } ${
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
                {!isCollapsed && (
                  <span className="font-black text-sm tracking-tight whitespace-nowrap overflow-hidden">{item.label}</span>
                )}
                {isCollapsed && (
                  <div className="absolute left-16 bg-slate-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={`bg-black/40 border-t border-white/5 transition-all duration-300 ${isCollapsed ? 'p-3 flex justify-center' : 'p-4'}`}>
        <button
          onClick={logout}
          className={`flex items-center rounded-xl transition-all duration-300 group font-bold text-sm text-gray-400 hover:bg-harx-600/20 hover:text-harx-400 ${
            isCollapsed ? 'justify-center p-3' : 'w-full space-x-3 py-2 px-4'
          }`}
        >
          <div className="p-2 rounded-lg bg-gray-800/50 group-hover:bg-harx-500/20 transition-colors shrink-0">
            <LogOut className="h-4 w-4" />
          </div>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}