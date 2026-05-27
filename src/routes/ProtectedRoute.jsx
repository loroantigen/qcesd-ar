import { Navigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, userData, isLoading } = useStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!userData?.approved) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (requireAdmin && userData?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;