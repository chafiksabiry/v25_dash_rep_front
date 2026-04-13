import React, { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, UserCircle, LogOut, Settings, Monitor, Calendar, ChevronLeft, ChevronRight, X, ChevronDown, Phone, User, PhoneOutgoing, GraduationCap } from 'lucide-react';
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

type TrainingSidebarModule = {
  title: string;
  sections: string[];
};

export function Sidebar({ phases, isSidebarOpen, setIsSidebarOpen, isCollapsed, setIsCollapsed }: SidebarProps) {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isPhaseCompleted = (phaseNumber: number): boolean => {
    if (!phases) return false;
    return phases[`phase${phaseNumber}` as keyof Phases]?.status === 'completed';
  };

  const [isWorkspaceOpen, setIsWorkspaceOpen] = React.useState(location.pathname.includes('/workspace'));
  const [isTrainingOpen, setIsTrainingOpen] = React.useState(location.pathname.includes('/training'));
  const [trainingModules, setTrainingModules] = React.useState<TrainingSidebarModule[]>([]);
  const [activeTrainingModuleIndex, setActiveTrainingModuleIndex] = React.useState<number>(0);

  // Ensure workspace is open if we navigate there externally
  useEffect(() => {
    if (location.pathname.includes('/workspace')) {
      setIsWorkspaceOpen(true);
    }
    if (location.pathname.includes('/training')) {
      setIsTrainingOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const readTrainingSidebarData = () => {
      try {
        const raw = localStorage.getItem('repTrainingSidebarModules');
        const parsed = raw ? JSON.parse(raw) : [];
        setTrainingModules(
          Array.isArray(parsed)
            ? parsed.map((m: any, idx: number) => ({
                title: String(m?.title || `Module ${idx + 1}`),
                sections: Array.isArray(m?.sections) ? m.sections.map((s: any) => String(s)) : []
              }))
            : []
        );
      } catch {
        setTrainingModules([]);
      }
      const idx = parseInt(localStorage.getItem('repTrainingSidebarActiveModuleIndex') || '0', 10);
      setActiveTrainingModuleIndex(Number.isFinite(idx) ? idx : 0);
    };
    readTrainingSidebarData();
    window.addEventListener('rep-training-modules-updated', readTrainingSidebarData as EventListener);
    window.addEventListener('storage', readTrainingSidebarData);
    return () => {
      window.removeEventListener('rep-training-modules-updated', readTrainingSidebarData as EventListener);
      window.removeEventListener('storage', readTrainingSidebarData);
    };
  }, []);

  const navItems = [
    {
      icon: UserCircle,
      label: 'Profile',
      path: '/profile',
      isAccessible: () => true
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
      icon: GraduationCap,
      label: 'Training',
      path: '/training',
      isAccessible: () => isPhaseCompleted(4),
      subItems: trainingModules.map((module, idx) => ({
        label: module.title,
        sections: module.sections,
        path: `/training#module-${idx + 1}`
      }))
    },
    {
      icon: Monitor,
      label: 'Workspace',
      path: '/workspace',
      isAccessible: () => isPhaseCompleted(4),
      subItems: [
        { label: 'Leads', path: '/workspace?tab=voice', icon: User },
        { label: 'Call History', path: '/workspace?tab=calls', icon: PhoneOutgoing },
        { label: 'Copilot', path: '/workspace?tab=copilot', icon: Phone }
      ]
    },
    {
      icon: Calendar,
      label: 'Session Planning',
      path: '/session-planning',
      isAccessible: () => true
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
    });
  }, [phases]);

  return (
    <div 
      className={`fixed inset-y-0 left-0 z-30 bg-gradient-to-b from-[#0f111a] to-[#150a11] text-white transition-all duration-300 ease-in-out md:relative shadow-2xl border-r border-white/10 flex flex-col overflow-y-auto overflow-x-hidden ${
        !isSidebarOpen
          ? '-translate-x-full md:translate-x-0'
          : 'translate-x-0'
      } ${isCollapsed ? 'w-20' : 'w-72'}`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
      {/* Toggle Button - Modern Floating Style */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-12 bg-harx-500 text-white rounded-full p-1.5 shadow-lg shadow-harx-500/30 hover:scale-110 active:scale-95 transition-all z-[60] hidden md:flex"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`h-[90px] flex items-center justify-between border-b border-white/5 bg-[#0a0b14]/50 backdrop-blur-sm transition-all duration-300 shrink-0 ${isCollapsed ? 'px-4 justify-center' : 'px-6'}`}>
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

      <nav className="flex-1 px-4 py-4 flex flex-col min-h-0 space-y-1">
        {filteredNavItems.map((item) => (
          <div key={item.path} className="space-y-1">
            {item.label === 'Training' && Array.isArray(item.subItems) && item.subItems.length > 0 && !isCollapsed ? (
              <>
                <button
                  onClick={() => {
                    setIsTrainingOpen(!isTrainingOpen);
                    if (!location.pathname.includes('/training')) navigate('/training');
                  }}
                  className={`flex w-full items-center rounded-2xl transition-all duration-300 group relative space-x-3 py-3 px-5 ${
                    isTrainingOpen || window.location.pathname.includes(item.path)
                      ? 'bg-white/5 text-white'
                      : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-all shrink-0 ${isTrainingOpen || window.location.pathname.includes(item.path) ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' : 'bg-gray-800/40 group-hover:bg-gray-800'}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="font-black text-sm tracking-tight whitespace-nowrap overflow-hidden flex-1 text-left">{item.label}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isTrainingOpen ? 'rotate-180 text-harx-400' : 'text-gray-400'}`} />
                </button>
                {isTrainingOpen && (
                  <div className="ml-5 pl-2 border-l border-white/10 space-y-1 animate-in slide-in-from-top-1 duration-200">
                    {item.subItems.map((sub: any, idx) => {
                      const isActiveSub = activeTrainingModuleIndex === idx && location.pathname.includes('/training');
                      return (
                        <div
                          key={sub.path}
                          className={`flex w-full items-center rounded-xl transition-all duration-300 group relative space-x-3 py-2.5 px-4 ${
                            isActiveSub
                              ? 'bg-gradient-to-r from-harx-500/20 to-transparent text-white border-l-2 border-harx-500'
                              : 'text-gray-500'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className={`font-black text-[11px] uppercase tracking-widest ${isActiveSub ? 'text-harx-400' : 'text-current'}`}>
                              {idx + 1}. {sub.label}
                            </p>
                            {Array.isArray(sub.sections) && sub.sections.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {sub.sections.slice(0, 4).map((section: string, sIdx: number) => (
                                  <p key={`${sub.path}-section-${sIdx}`} className="truncate text-[10px] font-semibold normal-case tracking-normal text-gray-400">
                                    - {section}
                                  </p>
                                ))}
                                {sub.sections.length > 4 && (
                                  <p className="text-[10px] font-semibold text-gray-500">
                                    +{sub.sections.length - 4} more
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : item.subItems && !isCollapsed ? (
              <>
                <button
                  onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
                  className={`flex w-full items-center rounded-2xl transition-all duration-300 group relative space-x-3 py-3 px-5 ${
                    isWorkspaceOpen || window.location.pathname.includes(item.path)
                      ? 'bg-white/5 text-white'
                      : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-all shrink-0 ${isWorkspaceOpen || window.location.pathname.includes(item.path) ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' : 'bg-gray-800/40 group-hover:bg-gray-800'}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="font-black text-sm tracking-tight whitespace-nowrap overflow-hidden flex-1 text-left">{item.label}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isWorkspaceOpen ? 'rotate-180 text-harx-400' : 'text-gray-400'}`} />
                </button>
                
                {isWorkspaceOpen && (
                  <div className="ml-5 pl-2 border-l border-white/10 space-y-1 animate-in slide-in-from-top-1 duration-200">
                    {item.subItems.map((sub) => {
                      const isSubActive = location.search.includes(sub.path.split('?')[1]);
                      return (
                        <NavLink
                          key={sub.path}
                          to={sub.path}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(sub.path);
                          }}
                          className={`flex w-full items-center rounded-xl transition-all duration-300 group relative space-x-3 py-2.5 px-4 ${
                            isSubActive
                              ? 'bg-gradient-to-r from-harx-500/20 to-transparent text-white border-l-2 border-harx-500'
                              : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                          }`}
                        >
                          <sub.icon className={`h-3.5 w-3.5 transition-colors ${isSubActive ? 'text-harx-400' : 'text-current'}`} />
                          <span className={`font-black text-[11px] uppercase tracking-widest ${isSubActive ? 'text-harx-400' : 'text-current'}`}>
                            {sub.label}
                          </span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <NavLink
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
                    {isCollapsed && item.subItems && (
                       <div className="absolute top-0 right-0 w-2 h-2 bg-harx-500 rounded-full border-2 border-slate-950 translate-x-1/2 -translate-y-1/2"></div>
                    )}
                    {isCollapsed && (
                      <div className="absolute left-16 bg-slate-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                        {item.label}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            )}
          </div>
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