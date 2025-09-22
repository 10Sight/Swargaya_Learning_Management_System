# Protected Routes & Authentication Guide

This guide explains the protected routing system implemented for the Learning Management System admin panel.

## Overview

The authentication system now includes:
- ✅ **Protected Routes** - Require authentication to access
- ✅ **Public Routes** - Redirect authenticated users away
- ✅ **Persistent Authentication** - Maintains login state across browser sessions
- ✅ **Automatic Redirects** - Smart navigation based on auth state
- ✅ **Loading States** - Smooth user experience during auth checks

## File Structure

```
src/
├── components/
│   ├── ProtectedRoute.jsx    # Protects routes requiring authentication
│   ├── PublicRoute.jsx       # Handles public routes (login page)
│   ├── AuthProvider.jsx      # Initializes auth state on app load
│   └── index.js             # Export all components
├── Layout/
│   └── HomeLayout.jsx       # Main layout (now login-free)
├── pages/
│   └── Login.jsx            # Login page (with redirect logic)
└── App.jsx                  # Updated routing structure
```

## How It Works

### 1. App Structure
```jsx
<Router>
  <Routes>
    {/* Public route - redirects if authenticated */}
    <Route path="/login" element={
      <PublicRoute>
        <Login />
      </PublicRoute>
    } />
    
    {/* Protected routes - requires authentication */}
    <Route path="/" element={
      <ProtectedRoute>
        <HomeLayout />
      </ProtectedRoute>
    }>
      <Route index element={<Home />} />
      <Route path="admin/instructor" element={<Instructor />} />
    </Route>
  </Routes>
</Router>
```

### 2. Authentication Flow

#### First Time Visit:
1. **AuthProvider** checks localStorage for `isLoggedIn`
2. If `true` but no user data → calls profile API to restore session
3. If API fails → clears localStorage and redirects to login
4. If no localStorage → user remains on current route

#### Login Process:
1. User submits login form
2. Redux action dispatched → API call made
3. On success → user data stored in Redux + localStorage
4. **PublicRoute** detects authentication → redirects to dashboard
5. If there was an intended destination → redirects there instead

#### Accessing Protected Routes:
1. **ProtectedRoute** checks Redux auth state
2. If not authenticated → redirects to login with intended destination
3. If authenticated → renders the protected component

#### Logout Process:
1. User clicks logout in HomeLayout
2. Redux logout action → API call + clear localStorage
3. Navigate to login page with replace: true

### 3. Component Details

#### ProtectedRoute.jsx
```jsx
// Checks authentication and shows loading while verifying
// Redirects to login if not authenticated
// Passes intended destination to login page
```

#### PublicRoute.jsx  
```jsx
// Redirects authenticated users to dashboard
// Allows access to login page for non-authenticated users
// Maintains intended destination for post-login redirect
```

#### AuthProvider.jsx
```jsx
// Initializes authentication on app load
// Restores session from localStorage if available
// Handles failed authentication restoration
```

## Usage Examples

### Adding New Protected Routes
```jsx
// In App.jsx, add inside the ProtectedRoute
<Route path="new-page" element={<NewPage />} />
```

### Adding New Public Routes
```jsx
// Add separate public routes
<Route path="/forgot-password" element={
  <PublicRoute>
    <ForgotPassword />
  </PublicRoute>
} />
```

### Checking Auth Status in Components
```jsx
import { useSelector } from 'react-redux';

function MyComponent() {
  const { isLoggedIn, user } = useSelector((state) => state.auth);
  
  return (
    <div>
      {isLoggedIn ? (
        <p>Welcome, {user?.fullName}!</p>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
}
```

## Features

### ✅ Persistent Login
- Login state maintained across browser sessions
- Automatic session restoration on page refresh
- Secure token-based authentication

### ✅ Smart Redirects
- Remembers intended destination before login
- Redirects to dashboard if no specific destination
- Prevents authenticated users from accessing login page

### ✅ Loading States
- Shows spinner while verifying authentication
- Smooth transitions between auth states
- No flash of incorrect content

### ✅ User Profile Display
- Dynamic user information in header
- Shows actual user avatar or generated initials
- Displays user role and name from Redux state

### ✅ Secure Logout
- Clears both server session and local storage
- Handles API failures gracefully
- Immediate redirect to login page

## Security Considerations

1. **Token Storage**: Auth tokens stored in secure HTTP-only cookies
2. **Local Storage**: Only stores boolean flag, not sensitive data
3. **API Calls**: All protected routes verify authentication server-side
4. **Route Guards**: Client-side protection prevents UI access without auth
5. **Session Restoration**: Failed restoration clears local data

## Troubleshooting

### User Stuck in Loading State
- Check if profile API is responding
- Verify network connectivity
- Clear localStorage: `localStorage.removeItem('isLoggedIn')`

### Login Not Redirecting
- Check Redux state updates in browser DevTools
- Verify login API response format
- Ensure AuthProvider is wrapping the app

### Routes Not Protected
- Verify ProtectedRoute is wrapping the route
- Check Redux auth state
- Ensure store is properly configured

## API Requirements

Your backend should handle:
- `POST /api/v1/auth/login` - Login with credentials
- `GET /api/v1/auth/profile` - Get current user profile
- `POST /api/v1/auth/logout` - Clear server session

## Migration Notes

If upgrading from previous implementation:
1. ✅ Login page is now separate from HomeLayout
2. ✅ All protected routes automatically secured
3. ✅ User profile displays actual data
4. ✅ Improved error handling and user experience

The system is now production-ready with robust authentication handling!
