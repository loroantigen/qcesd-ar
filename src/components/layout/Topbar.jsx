import { useLocation } from 'react-router-dom';
import { Menu, Bell, User, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { format } from 'date-fns';

const Topbar = () => {
  const { userData, sidebarOpen, toggleSidebar } = useStore();
  const location = useLocation();
  const currentDate = format(new Date(), 'EEEE, MMMM dd, yyyy');
  const currentTime = format(new Date(), 'hh:mm a');

  const getPageTitle = () => {
    const titles = {
      '/dashboard': 'Dashboard',
      '/daily-reports': 'Daily Reports',
      '/insert-daily-report': 'Insert Daily Report',
      '/accomplished-report': 'Accomplished Report',
      '/landing-settings': 'Landing Settings',
      '/admin': 'Admin Panel',
    };
    return titles[location.pathname] || 'QCESD System';
  };

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return paths.map((path, index) => ({
      label: path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' '),
      path: '/' + paths.slice(0, index + 1).join('/'),
    }));
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden lg:flex"
          >
            <Menu size={20} className="text-gray-600" />
          </button>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{getPageTitle()}</h2>
            <nav className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <span>Home</span>
              {getBreadcrumbs().map((crumb, index) => (
                <span key={crumb.path} className="flex items-center gap-2">
                  <ChevronRight size={14} />
                  <span className={index === getBreadcrumbs().length - 1 ? 'text-primary-600 font-medium' : ''}>
                    {crumb.label}
                  </span>
                </span>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-gray-800">{currentDate}</p>
            <p className="text-xs text-gray-500">{currentTime}</p>
          </div>
          
          <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                <User size={18} className="text-primary-600" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-800">{userData?.fullname}</p>
                <p className="text-xs text-gray-500 capitalize">{userData?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;