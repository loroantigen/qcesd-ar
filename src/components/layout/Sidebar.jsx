import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, FileText, PlusCircle, ClipboardList, 
  Settings, Shield, LogOut, Menu, X
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import toast from 'react-hot-toast';

const Sidebar = () => {
  const { userData, sidebarOpen, toggleSidebar } = useStore();
  const location = useLocation();
  const isAdmin = userData?.role === 'admin';

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Home', icon: Home },
    { path: '/daily-reports', label: 'Daily Report', icon: ClipboardList },
    { path: '/insert-daily-report', label: 'Insert Daily Report', icon: PlusCircle },
    { path: '/accomplished-report', label: 'Accomplished Report', icon: FileText },
    { path: '/landing-settings', label: 'Landing Settings', icon: Settings },
    ...(isAdmin ? [{ path: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <>
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-navy-800 text-white rounded-lg lg:hidden"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`
        fixed top-0 left-0 z-40 h-screen w-64 bg-navy-900 text-white transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'}
        lg:static lg:h-screen
      `}>
        <div className="flex flex-col h-full">
          <div className={`p-6 border-b border-navy-800 ${!sidebarOpen && 'lg:hidden'}`}>
            <h1 className="text-xl font-bold tracking-wider">QCESD</h1>
            <p className="text-xs text-navy-400 mt-1">Accomplishment Report</p>
          </div>

          <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-primary-600 text-white' 
                      : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className={`font-medium ${!sidebarOpen && 'lg:hidden'}`}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-navy-800">
            <div className={`mb-4 ${!sidebarOpen && 'lg:hidden'}`}>
              <p className="text-sm font-medium text-white truncate">{userData?.fullname}</p>
              <p className="text-xs text-navy-400 capitalize">{userData?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-navy-300 hover:text-white hover:bg-navy-800 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span className={`font-medium ${!sidebarOpen && 'lg:hidden'}`}>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;