import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  fullname: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  position: z.string().min(2, 'Position is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      
      await updateProfile(userCredential.user, {
        displayName: data.fullname,
      });

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        fullname: data.fullname,
        email: data.email,
        position: data.position,
        role: 'employee',
        approved: false,
        createdAt: new Date().toISOString(),
      });

      toast.success('Registration successful! Waiting for admin approval.');
      navigate('/pending-approval');
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">QCESD</h1>
          <p className="text-navy-400">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Register</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              {...register('fullname')}
              error={errors.fullname?.message}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              {...register('email')}
              error={errors.email?.message}
            />

            <Input
              label="Position"
              placeholder="Enter your position"
              {...register('position')}
              error={errors.position?.message}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                {...register('password')}
                error={errors.password?.message}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              <UserPlus size={20} className="mr-2" />
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;