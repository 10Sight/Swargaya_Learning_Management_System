import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { profile } from '@/Redux/Slice/AuthSlice';

const ProtectedRoute = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { isLoggedIn, user } = useSelector((state) => state.auth);

  // Check if user is authenticated on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      // Only check profile if localStorage indicates user should be logged in
      // but Redux state doesn't have user data
      const isLoggedInFromStorage = localStorage.getItem('isLoggedIn') === 'true';

      if (isLoggedInFromStorage && !user) {
        try {
          await dispatch(profile()).unwrap();
        } catch (error) {
          // If profile check fails, user will be redirected to login
        }
      }
    };

    checkAuthStatus();
  }, [dispatch, user]);

  // Show loading while checking authentication
  if (localStorage.getItem('isLoggedIn') === 'true' && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563eb] mx-auto"></div>
          <p className="mt-4 text-[#4b5563]">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login with the current location
  if (!isLoggedIn || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the protected component
  return children;
};

export default ProtectedRoute;
