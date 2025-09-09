import React, { useState } from 'react';
import { Role, Category } from '../types';
import { 
  LayoutDashboardIcon, LibraryIcon, UserCircleIcon, SettingsIcon, PlayCircleIcon, AwardIcon, type IconProps, UsersIcon, BarChart2Icon, BookOpenIcon, LogOutIcon, XIcon, MailIcon, CalendarIcon, HistoryIcon, VideoIcon, LifeBuoyIcon, ChevronDownIcon, ChevronUpIcon 
} from './Icons';

// FIX: Added 'course-editor' as a valid view type. It's an internal view like 'player'.
export type View = 
  | 'dashboard' 
  | 'my-courses'
  | 'analytics' 
  | 'user-management'
  | 'platform-settings'
  | 'certifications'
  | 'inbox'
  | 'calendar'
  | 'history'
  | 'profile' // Added profile to the view types
  | 'player' // internal view
  | 'student-management'
  | 'live-sessions'
  | 'help'
  | 'course-editor'; // internal view

// New nested type for the tree structure
interface CategoryNode extends Category {
    children: CategoryNode[];
}

// Props for the recursive category item component
interface CategoryNavItemProps {
    categoryNode: CategoryNode;
    onSelectCategory: (id: string | null) => void;
    selectedCategoryId: string | null;
    level: number;
}

const CategoryNavItem: React.FC<CategoryNavItemProps> = ({ categoryNode, onSelectCategory, selectedCategoryId, level }) => {
    const [isOpen, setIsOpen] = useState(true); // Default to open
    const isActive = selectedCategoryId === categoryNode.id;
    const hasChildren = categoryNode.children.length > 0;

    return (
        <li>
            <div 
              className={`flex items-center justify-between p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group ${isActive ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400' : ''}`}
              style={{ paddingLeft: `${12 + level * 16}px`}}
            >
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); onSelectCategory(categoryNode.id); }}
                  className="flex-grow font-semibold text-sm"
                >
                    {categoryNode.name}
                </a>
                {hasChildren && (
                    <button onClick={() => setIsOpen(!isOpen)} className="p-1">
                        {isOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                    </button>
                )}
            </div>
            {hasChildren && isOpen && (
                <ul className="pl-2">
                    {categoryNode.children.map(childNode => (
                        <CategoryNavItem 
                            key={childNode.id}
                            categoryNode={childNode}
                            onSelectCategory={onSelectCategory}
                            selectedCategoryId={selectedCategoryId}
                            level={level + 1}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};


interface SidebarProps {
  userRole: Role;
  viewAsRole: Role;
  // FIX: Excluded 'course-editor' from direct navigation, consistent with 'player'.
  onNavigate: (view: Exclude<View, 'player' | 'course-editor'>) => void;
  currentView: View;
  isMobileMenuOpen: boolean;
  closeMenu: () => void;
  onLogout: () => void;
  categories: Category[];
  onSelectCategory: (id: string | null) => void;
  selectedCategoryId: string | null;
}

const NavItem: React.FC<{ icon: React.ReactElement<IconProps>; label: string; active?: boolean; onClick?: () => void }> = ({ icon, label, active, onClick }) => (
  <li>
    <a 
      href="#" 
      onClick={(e) => { e.preventDefault(); onClick?.(); }}
      className={`flex items-center p-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group ${active ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400' : ''}`}
    >
      {React.cloneElement(icon, { className: `w-6 h-6 transition-colors group-hover:text-pink-500 dark:group-hover:text-pink-400 ${active ? 'text-pink-600 dark:text-pink-400' : 'text-gray-400 dark:text-gray-500'}` })}
      <span className="ml-4 font-semibold">{label}</span>
    </a>
  </li>
);

export const Sidebar: React.FC<SidebarProps> = ({ userRole, viewAsRole, onNavigate, currentView, isMobileMenuOpen, closeMenu, onLogout, categories, onSelectCategory, selectedCategoryId }) => {

  const navItems = {
    [Role.STUDENT]: [
      { view: 'dashboard', icon: <LayoutDashboardIcon />, label: 'Dashboard' },
      { view: 'inbox', icon: <MailIcon />, label: 'Inbox' },
      { view: 'calendar', icon: <CalendarIcon />, label: 'Calendar' },
      { view: 'history', icon: <HistoryIcon />, label: 'History' },
      { view: 'certifications', icon: <AwardIcon />, label: 'Certifications' },
      { view: 'help', icon: <LifeBuoyIcon />, label: 'Help' },
    ],
    [Role.INSTRUCTOR]: [
      { view: 'dashboard', icon: <LayoutDashboardIcon />, label: 'Dashboard' },
      { view: 'my-courses', icon: <BookOpenIcon />, label: 'My Courses' },
      { view: 'student-management', icon: <UsersIcon />, label: 'Student Management' },
      { view: 'live-sessions', icon: <VideoIcon />, label: 'Live Sessions' },
      { view: 'inbox', icon: <MailIcon />, label: 'Inbox' },
      { view: 'calendar', icon: <CalendarIcon />, label: 'Calendar' },
      { view: 'history', icon: <HistoryIcon />, label: 'History' },
      { view: 'analytics', icon: <BarChart2Icon />, label: 'Analytics' },
    ],
    [Role.ADMIN]: [
      { view: 'dashboard', icon: <LayoutDashboardIcon />, label: 'Dashboard' },
      // Instructor capabilities
      { view: 'my-courses', icon: <BookOpenIcon />, label: 'My Courses' },
      { view: 'student-management', icon: <UsersIcon />, label: 'Student Management' },
      { view: 'analytics', icon: <BarChart2Icon />, label: 'Analytics' },
      // Admin capabilities
      { view: 'user-management', icon: <UsersIcon />, label: 'User Management' },
      { view: 'platform-settings', icon: <SettingsIcon />, label: 'Settings' },
      // Shared/Communication
      { view: 'live-sessions', icon: <VideoIcon />, label: 'Live Sessions' },
      { view: 'inbox', icon: <MailIcon />, label: 'Inbox' },
      { view: 'calendar', icon: <CalendarIcon />, label: 'Calendar' },
      { view: 'history', icon: <HistoryIcon />, label: 'History' },
    ],
  };

  const commonItems = [
      { view: 'profile', icon: <UserCircleIcon />, label: 'Profile' },
  ];

  // Helper to build the category tree
  const buildCategoryTree = (items: Category[], parentId: string | null = null): CategoryNode[] => {
      return items
          .filter(item => item.parentId === parentId)
          .map(item => ({
              ...item,
              children: buildCategoryTree(items, item.id)
          }));
  };
  
  const categoryTree = buildCategoryTree(categories);

  const getNavItems = () => {
    // Display navigation based on the role the user is currently viewing as.
    return navItems[viewAsRole] || [];
  }

  const handleLogoutClick = () => {
    closeMenu();
    onLogout();
  };
  
  const logoUrl = "https://i.postimg.cc/TYYjfM7n/Nexus-logo.jpg";

  const handleNavigateClick = (view: Exclude<View, 'player' | 'course-editor'>) => {
    onNavigate(view);
    closeMenu();
  };
  
  const currentNavItems = getNavItems();

  return (
    <aside className={`fixed inset-y-0 left-0 md:relative md:translate-x-0 w-64 bg-white dark:bg-gray-800 h-full flex flex-col z-50 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between h-24 px-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <a href="#" onClick={(e) => { e.preventDefault(); handleNavigateClick('dashboard'); }} className="flex items-center gap-2">
            <img src={logoUrl} alt="Nexus by Intersect Logo" className="h-20" />
        </a>
        <button onClick={closeMenu} className="md:hidden p-2 text-gray-500 dark:text-gray-400">
            <XIcon className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Menu</p>
        <ul>
          {currentNavItems.map(item => (
            <NavItem 
              key={item.view}
              icon={item.icon} 
              label={item.label} 
              active={currentView === item.view} 
              onClick={() => handleNavigateClick(item.view as Exclude<View, 'player' | 'course-editor'>)} 
            />
          ))}
        </ul>
        
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Categories</p>
            <ul>
                <li>
                   <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); onSelectCategory(null); }}
                      className={`flex items-center p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group font-semibold text-sm ${selectedCategoryId === null && currentView === 'dashboard' ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400' : ''}`}
                    >
                      <LibraryIcon className={`w-5 h-5 mr-3 ${selectedCategoryId === null && currentView === 'dashboard' ? 'text-pink-600 dark:text-pink-400' : 'text-gray-400 dark:text-gray-500'}`} />
                      All Courses
                    </a>
                </li>
                {categoryTree.map(categoryNode => (
                    <CategoryNavItem 
                        key={categoryNode.id}
                        categoryNode={categoryNode}
                        onSelectCategory={onSelectCategory}
                        selectedCategoryId={selectedCategoryId}
                        level={0}
                    />
                ))}
            </ul>
        </div>

        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</p>
            <ul>
                 {commonItems.map(item => (
                    <NavItem 
                        key={item.view}
                        icon={item.icon}
                        label={item.label}
                        active={currentView === item.view}
                        onClick={() => handleNavigateClick(item.view as Exclude<View, 'player' | 'course-editor'>)}
                    />
                ))}
                <li>
                    <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); handleLogoutClick(); }}
                        className="flex items-center p-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
                    >
                        <LogOutIcon className="w-6 h-6 text-gray-400 dark:text-gray-500 transition-colors group-hover:text-pink-500 dark:group-hover:text-pink-400" />
                        <span className="ml-4 font-semibold">Logout</span>
                    </a>
                </li>
            </ul>
        </div>
      </nav>
    </aside>
  );
};