import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Clock, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const PendingApproval = () => {
  const { userData } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (userData?.approved) {
      navigate('/dashboard');
    }
    if (!userData) {
      navigate('/login');
    }
  }, [userData, navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-lg text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={40} className="text-yellow-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Waiting for Admin Approval</h2>
          <p className="text-gray-600 mb-6">
            Your account has been created successfully but requires administrator approval before you can access the system.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-600"><strong>Name:</strong> {userData?.fullname}</p>
            <p className="text-sm text-gray-600"><strong>Email:</strong> {userData?.email}</p>
            <p className="text-sm text-gray-600"><strong>Position:</strong> {userData?.position}</p>
          </div>

          <Button onClick={handleLogout} variant="outline" className="w-full">
            <LogOut size={20} className="mr-2" />
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;