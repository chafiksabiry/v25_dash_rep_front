import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, UserCircle, LogOut, Wallet, BookOpen, Settings, Monitor, Users } from 'lucide-react';
import Cookies from 'js-cookie';
import { clearProfileData } from '../utils/profileUtils';

interface SidebarProps {
  currentStatus: number;
}

export function Sidebar({ currentStatus }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear all items from localStorage
    localStorage.clear();

    // Clear all cookies
    const cookies = Cookies.get();
    Object.keys(cookies).forEach(cookieName => {
      Cookies.remove(cookieName);
    });

    //window.location.replace('/auth');
    // Send logout message to parent window
    console.log('🚪 Sending logout message to parent window');
    window.parent.postMessage({ type: 'LOGOUT' }, '*');
    console.log('✅ Logout message sent');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', minStatus: 5 },
    { icon: Briefcase, label: 'Gigs', path: '/gigs-marketplace', minStatus: 5 },
    { icon: Monitor, label: 'Workspace', path: '/workspace', minStatus: 5 },
    //{ icon: Wallet, label: 'Wallet', path: '/wallet', minStatus: 5 },
    //{ icon: BookOpen, label: 'Learning', path: '/learning', minStatus: 5 },
    //{ icon: Users, label: 'Community', path: '/community', minStatus: 5 },
    { icon: UserCircle, label: 'Profile', path: '/profile', minStatus: 0 },
    { icon: Settings, label: 'Operations', path: '/operations', minStatus: 5 },
  ];

  const filteredNavItems = navItems.filter(item => currentStatus >= item.minStatus);

  useEffect(() => {
    console.log('🔒 Access Control Status:', {
      currentPhase: currentStatus,
      accessLevel: currentStatus >= 5 ? 'Full Access' : 'Limited Access',
      availableNavItems: filteredNavItems.map(item => item.label),
      restrictedNavItems: navItems
        .filter(item => currentStatus < item.minStatus)
        .map(item => item.label)
    });
  }, [currentStatus]);

  return (
    <div className="w-64 bg-white border-r border-gray-200">
      <div className="h-16 flex items-center justify-center border-b border-gray-200">
        <h1 className="text-2xl font-bold text-blue-600">HARX.AI</h1>
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
          onClick={handleLogout}
          className="w-full flex items-center px-6 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors mt-auto"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}