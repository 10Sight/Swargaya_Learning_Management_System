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

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

const Login = () => {
  const { width } = useWindowSize();
  const isLargeScreen = width >= 1024;
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
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(to bottom right, #f8fafc, #eff6ff, #e0e7ff)' }}
    >
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.4'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      ></div>

      <div
        className="relative z-10"
        style={{
          position: 'relative',
          zIndex: 10,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: isLargeScreen ? 'row' : 'column'
        }}
      >
        {/* Left Side - Branding */}
        {isLargeScreen && (
          <div
            style={{
              display: 'flex',
              width: '50%',
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: '#ffffff'
            }}
          >
            <img
              src="/marelli-motherson.webp"
              alt="Marelli Motherson"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
        )}

        {/* Right Side - Login Form */}
        <div
          style={{
            width: isLargeScreen ? '50%' : '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <Card
            className="border-0 shadow-2xl relative"
            style={{
              width: '100%',
              maxWidth: '28rem',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(4px)',
              position: 'relative'
            }}
          >
            {/* Logo in top right */}
            <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 20 }}>
              <img
                src="/motherson+marelli.png"
                alt="Logo"
                style={{ height: '2rem', width: 'auto', objectFit: 'contain' }}
              />
            </div>

            <CardHeader style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem', paddingTop: '3rem' }}>
              <div
                className="rounded-2xl shadow-lg"
                style={{
                  width: '4rem',
                  height: '4rem',
                  background: 'linear-gradient(to right, #3b82f6, #4f46e5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}
              >
                <GraduationCap className="h-8 w-8 text-[#ffffff]" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #2563eb, #4f46e5)' }}>
                  Welcome Back
                </CardTitle>
                <CardDescription style={{ color: '#4b5563' }}>
                  Sign in to access your learning dashboard
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Login Method Selector */}
              <div
                className="rounded-lg"
                style={{
                  display: 'flex',
                  padding: '0.25rem',
                  backgroundColor: 'rgba(241, 245, 249, 0.8)',
                  backdropFilter: 'blur(4px)'
                }}
              >
                <button
                  type="button"
                  className="rounded-md transition-all duration-300"
                  style={{
                    flex: 1,
                    padding: '0.625rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    ...(loginMethod === 'email'
                      ? { backgroundColor: '#ffffff', color: '#2563eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #dbeafe' }
                      : { color: '#4b5563' })
                  }}
                  onMouseEnter={(e) => { if (loginMethod !== 'email') { e.currentTarget.style.color = '#1f2937'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)' } }}
                  onMouseLeave={(e) => { if (loginMethod !== 'email') { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.backgroundColor = 'transparent' } }}
                  onClick={() => handleLoginMethodChange('email')}
                >
                  <Mail size={16} />
                  Email
                </button>
                <button
                  type="button"
                  className="rounded-md transition-all duration-300"
                  style={{
                    flex: 1,
                    padding: '0.625rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    ...(loginMethod === 'username'
                      ? { backgroundColor: '#ffffff', color: '#2563eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #dbeafe' }
                      : { color: '#4b5563' })
                  }}
                  onMouseEnter={(e) => { if (loginMethod !== 'username') { e.currentTarget.style.color = '#1f2937'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)' } }}
                  onMouseLeave={(e) => { if (loginMethod !== 'username') { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.backgroundColor = 'transparent' } }}
                  onClick={() => handleLoginMethodChange('username')}
                >
                  <User size={16} />
                  Username
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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

                <div
                  className="cursor-pointer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="cursor-pointer"
                    style={{ color: '#374151', fontSize: '0.875rem' }}
                  >
                    Remember me for 30 days
                  </Label>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="font-semibold shadow-lg transition-all duration-300 transform"
                  style={{
                    width: '100%',
                    color: '#ffffff',
                    background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                    opacity: isLoading ? 0.7 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transform: 'none'
                  }}
                  onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.background = 'linear-gradient(to right, #1d4ed8, #4338ca)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'; e.currentTarget.style.transform = 'scale(1.02)' } }}
                  onMouseLeave={(e) => { if (!isLoading) { e.currentTarget.style.background = 'linear-gradient(to right, #2563eb, #4f46e5)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'; e.currentTarget.style.transform = 'none' } }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing you in...
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span>Sign In</span>
                      <svg
                        className="ml-2 h-4 w-4 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ marginLeft: '0.5rem' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  )}
                </Button>
              </form>

              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#4b5563', fontSize: '0.875rem' }}>
                  Don't have an account?{' '}
                  <a
                    href="#"
                    className="font-semibold transition-colors"
                    style={{ color: '#2563eb', textDecoration: 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#1d4ed8'; e.currentTarget.style.textDecoration = 'underline' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.textDecoration = 'none' }}
                  >
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