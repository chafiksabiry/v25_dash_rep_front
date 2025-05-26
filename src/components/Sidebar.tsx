import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, UserCircle, LogOut, Wallet, BookOpen, Settings, Monitor, Users } from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Briefcase, label: 'Gigs', path: '/gigs-marketplace' },
    { icon: Monitor, label: 'Workspace', path: '/workspace' },
    //{ icon: Wallet, label: 'Wallet', path: '/wallet' },
    //{ icon: BookOpen, label: 'Learning', path: '/learning' },
    //{ icon: Users, label: 'Community', path: '/community' },
    { icon: UserCircle, label: 'Profile', path: '/profile' },
    { icon: Settings, label: 'Operations', path: '/operations' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200">
      <div className="h-16 flex items-center justify-center border-b border-gray-200">
        <h1 className="text-2xl font-bold text-blue-600">HARX.AI</h1>
      </div>
      <nav className="mt-6">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors ${
                isActive ? 'bg-blue-50 text-blue-600' : ''
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button className="w-full flex items-center px-6 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors mt-auto">
          <LogOut className="w-5 h-5 mr-3" />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}