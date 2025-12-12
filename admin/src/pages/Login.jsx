import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { FormInput } from '@/components/form';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, User, GraduationCap, Shield, BookOpen, Sparkles, Lock } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '@/Redux/Slice/AuthSlice';

const emailLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
});

const usernameLoginSchema = z.object({
  userName: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
});

const Login = () => {
  const [loginMethod, setLoginMethod] = useState('email');
  const [rememberMe, setRememberMe] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { isLoading, isLoggedIn, user } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm({
    resolver: zodResolver(loginMethod === 'email' ? emailLoginSchema : usernameLoginSchema),
  });
  const [formData, setFormData] = useState({
    email: '',
    userName: '',
    password: ''
  });

  useEffect(() => {
    if (!isLoggedIn || !user) return;

    const role = user?.role;
    const roleLayoutMap = {
      SUPERADMIN: '/superadmin',
      ADMIN: '/admin',
      INSTRUCTOR: '/instructor',
      STUDENT: '/student'
    };

    const targetPath = roleLayoutMap[role] || '/student';
    const from = location.state?.from?.pathname;
    const finalTarget = from || targetPath;

    if (location.pathname !== finalTarget) {
      navigate(finalTarget, { replace: true });
    }
  }, [isLoggedIn, user, navigate, location]);

  const handleLoginMethodChange = (method) => {
    setLoginMethod(method);
    reset();
    setFormData({ email: '', userName: '', password: '' });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValue(field, value);
  };

  const onSubmit = async (data) => {
    const loginData = loginMethod === 'email'
      ? { email: data.email.toLowerCase(), password: data.password }
      : { userName: data.userName.toLowerCase(), password: data.password };

    dispatch(login(loginData));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.4'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      ></div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-white">
          <img
            src="/marelli-motherson.webp"
            alt="Marelli Motherson"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm relative">
            {/* Logo in top right */}
            <div className="absolute top-6 right-6 z-20">
              <img
                src="/motherson+marelli.png"
                alt="Logo"
                className="h-8 w-auto object-contain"
              />
            </div>

            <CardHeader className="text-center space-y-4 pb-8 pt-12">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Sign in to access your learning dashboard
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Login Method Selector */}
              <div className="flex rounded-lg bg-slate-100/80 p-1 backdrop-blur-sm">
                <button
                  type="button"
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${loginMethod === 'email'
                      ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                    }`}
                  onClick={() => handleLoginMethodChange('email')}
                >
                  <Mail size={16} />
                  Email
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${loginMethod === 'username'
                      ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                    }`}
                  onClick={() => handleLoginMethodChange('username')}
                >
                  <User size={16} />
                  Username
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {loginMethod === 'email' ? (
                  <FormInput
                    type="email"
                    label="Email Address"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter your email address"
                    required
                    icon={<Mail className="h-4 w-4" />}
                    variant="filled"
                    disabled={isLoading}
                    error={errors.email?.message}
                    showSuccessIndicator={false}
                    helperText="We'll keep your account secure"
                  />
                ) : (
                  <FormInput
                    type="text"
                    label="Username"
                    value={formData.userName}
                    onChange={(e) => handleInputChange('userName', e.target.value)}
                    placeholder="Enter your username"
                    required
                    icon={<User className="h-4 w-4" />}
                    variant="filled"
                    disabled={isLoading}
                    error={errors.userName?.message}
                    showSuccessIndicator={false}
                    helperText="Your unique identifier"
                  />
                )}

                <div className="space-y-2">
                  <FormInput
                    type="password"
                    label="Password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter your password"
                    required
                    icon={<Lock className="h-4 w-4" />}
                    variant="filled"
                    disabled={isLoading}
                    error={errors.password?.message}
                    showSuccessIndicator={false}
                    helperText="Must be at least 6 characters"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="rememberMe" className="text-gray-700 cursor-pointer text-sm">
                    Remember me for 30 days
                  </Label>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:opacity-70`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing you in...
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <svg className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-gray-600 text-sm">
                  Don't have an account?{' '}
                  <a href="#" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors">
                    Contact Administrator
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;