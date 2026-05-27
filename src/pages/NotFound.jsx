import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={48} className="text-red-600" />
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <Link to="/dashboard">
          <Button>
            <Home size={20} className="mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;