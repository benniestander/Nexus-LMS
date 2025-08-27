import React, { useState } from 'react';
import { User, Role } from '../types';
import { ChevronDownIcon, UserCircleIcon, SettingsIcon, BellIcon, LogOutIcon } from './Icons';

interface HeaderProps {
  user: User;
  viewAsRole: Role;
  onSetViewAsRole: (role: Role) => void;
  onLogout: () => void;
}

const RoleSelector: React.FC<{ user: User, viewAsRole: Role, onSetViewAsRole: (role: Role) => void }> = ({ user, viewAsRole, onSetViewAsRole }) => {
    // Only admins and instructors can switch roles.
    if (user.role === Role.STUDENT) {
        return null;
    }

    const availableRoles = {
        [Role.ADMIN]: [Role.ADMIN, Role.INSTRUCTOR, Role.STUDENT],
        [Role.INSTRUCTOR]: [Role.INSTRUCTOR, Role.STUDENT],
        [Role.STUDENT]: [],
    };

    const rolesToDisplay = availableRoles[user.role];

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">View as:</span>
            <select
                value={viewAsRole}
                onChange={(e) => onSetViewAsRole(e.target.value as Role)}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm font-semibold focus:ring-pink-500 focus:border-pink-500 capitalize"
            >
                {rolesToDisplay.map(role => (
                    <option key={role} value={role} className="capitalize">{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                ))}
            </select>
        </div>
    );
};


export const Header: React.FC<HeaderProps> = ({ user, viewAsRole, onSetViewAsRole, onLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 h-20 flex items-center justify-between z-30 sticky top-0">
      <div className="flex items-center gap-8">
        <RoleSelector user={user} viewAsRole={viewAsRole} onSetViewAsRole={onSetViewAsRole} />
      </div>
      <div className="flex items-center gap-4">
        <button className="relative text-gray-500 dark:text-gray-400 hover:text-pink-500 transition-colors">
            <BellIcon className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
            </span>
        </button>

        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)} 
            className="flex items-center space-x-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full py-1 pr-3 pl-1 transition-colors"
            onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
          >
            <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">
              <UserCircleIcon className="w-8 h-8 text-pink-500" />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
            </div>
            <ChevronDownIcon className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-2 border border-gray-200 dark:border-gray-700 z-40">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <p className="font-semibold text-gray-800 dark:text-white">{user.firstName} {user.lastName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
              <div className="py-1">
                <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <UserCircleIcon className="w-4 h-4 mr-3" /> Profile
                </a>
                <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <SettingsIcon className="w-4 h-4 mr-3" /> Settings
                </a>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50">
                <LogOutIcon className="w-4 h-4 mr-3" /> Logout
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};