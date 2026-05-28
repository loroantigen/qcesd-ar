import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Toaster } from 'react-hot-toast';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <Topbar />
        
        <main className="flex-1 flex-auto p-6 overflow-auto w-full min-w-0">
  <Outlet />
</main>
        
        <footer className="bg-white border-t border-gray-200 px-6 py-4">
          <p className="text-sm text-gray-500 text-center">
            © {new Date().getFullYear()} QCESD Accomplishment Report System
          </p>
        </footer>
      </div>

      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
};

export default DashboardLayout;