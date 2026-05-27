import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';
import { Mail, ArrowLeft } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setIsSent(true);
      toast.success('Password reset email sent!');
    } catch (error) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">QCESD</h1>
          <p className="text-navy-400">Reset your password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {isSent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Check your email</h3>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to {email}
              </p>
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Forgot Password?</h2>
              <p className="text-gray-600 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Button type="submit" className="w-full" isLoading={isLoading}>
                  <Mail size={20} className="mr-2" />
                  Send Reset Link
                </Button>
              </form>

              <Link 
                to="/login" 
                className="flex items-center justify-center gap-2 mt-6 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <ArrowLeft size={16} />
                Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;