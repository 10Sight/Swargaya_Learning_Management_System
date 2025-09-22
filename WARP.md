# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a full-stack Learning Management System (LMS) built with:
- **Frontend (Admin Panel)**: React 19 + Vite + TailwindCSS + Redux Toolkit
- **Backend (Server)**: Node.js + Express + MongoDB + JWT Authentication

## Architecture

### Multi-Service Structure
The codebase is organized into two main services:
- `admin/` - React-based admin interface for course management
- `server/` - Express.js REST API backend with MongoDB

### Frontend Architecture (Admin Panel)
- **State Management**: Redux Toolkit with RTK Query for API calls
- **Authentication**: JWT-based with protected/public route guards
- **UI Framework**: Radix UI components with shadcn/ui + TailwindCSS
- **Notifications**: Sonner toast system integrated with Redux

### Backend Architecture (Server)
- **MVC Pattern**: Controllers, Models, Routes clearly separated
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT access/refresh token system with HTTP-only cookies
- **Logging**: Winston + Morgan for comprehensive logging
- **File Upload**: Cloudinary integration for media storage

### Key Architectural Patterns
- **API Layer**: RTK Query APIs in `admin/src/Redux/AllApi/` for each domain (Auth, User, Course, etc.)
- **Route Protection**: `ProtectedRoute` and `PublicRoute` components handle authentication flow
- **Error Handling**: Centralized error handling with `ApiError` utility class
- **Audit Logging**: Built-in audit trail system for tracking user actions

## Development Commands

### Frontend (Admin Panel)
```bash
cd admin
npm install           # Install dependencies
npm run dev          # Start development server (http://localhost:5174)
npm run build        # Production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend (Server)  
```bash
cd server
npm install          # Install dependencies  
npm start           # Start server with nodemon (http://localhost:3000)
```

### Full Stack Development
Run both services simultaneously:
```bash
# Terminal 1
cd server && npm start

# Terminal 2  
cd admin && npm run dev
```

## Key Configuration

### Environment Variables (Server)
Required in `server/.env`:
```
MONGO_URI=mongodb://localhost:27017/lms_db
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### API Configuration
- **Base URL**: `http://localhost:3000` (defined in `admin/src/Helper/axiosInstance.js`)
- **CORS**: Configured for `http://localhost:5174` in server
- **API Prefix**: All routes use `/api/v1/` or specific prefixes like `/api/users`

## Domain Models

### User Management
- **Roles**: ADMIN, INSTRUCTOR, STUDENT, SUPERADMIN  
- **Status**: ACTIVE, SUSPENDED, PENDING, BANNED
- **Authentication**: Email/password with JWT tokens
- **Features**: Profile management, role-based access, batch assignments

### Course Management  
- **Structure**: Course → Modules → Lessons hierarchy
- **Content**: Video URLs, text content, resources, duration tracking
- **Assessment**: Integrated quizzes and assignments per course
- **Status**: DRAFT, PUBLISHED, ARCHIVED with instructor ownership

### Assessment System
- **Quizzes**: Multiple choice with attempted quiz tracking
- **Assignments**: File submissions with grading workflow  
- **Progress**: Student progress tracking per course/module
- **Certificates**: Automated certificate generation on completion

### Batch & Enrollment
- **Batches**: Group management for courses with start/end dates
- **Enrollments**: Student-course associations with status tracking
- **Progress**: Detailed progress tracking with completion percentages

## Authentication System

### Frontend Authentication
- **Protected Routes**: Automatic redirect to login for unauthenticated users
- **Public Routes**: Redirect authenticated users away from login
- **Persistent Sessions**: localStorage + Redux state management
- **Loading States**: Smooth UX with loading indicators during auth checks

### Backend Authentication  
- **JWT Strategy**: Access tokens (15min) + Refresh tokens (7 days)
- **Cookie-based**: HTTP-only cookies for security
- **Middleware**: `verifyJWT` middleware for route protection
- **Session Management**: Login history and device tracking

## Testing and Development

### Running Single Components
```bash
# Test specific API endpoints
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}'

# Test frontend component in isolation
cd admin && npm run dev
# Navigate to specific routes like /admin/instructor
```

### Database Operations
```bash
# Connect to MongoDB (if running locally)
mongosh mongodb://localhost:27017/lms_db

# View collections
show collections

# Check users
db.users.find().limit(5)
```

### Debugging
- **Frontend**: React DevTools + Redux DevTools for state inspection
- **Backend**: Winston logs in console, Morgan for HTTP request logging  
- **Network**: Axios interceptors log all API requests/responses
- **Toast Notifications**: Sonner toasts show user-friendly error messages

## Important Implementation Details

### Redux Store Structure
```javascript
// Slice-based state management
store: {
  auth: { user, isLoggedIn, isLoading, error },
  user: { users, filters, pagination },  
  course: { courses, selectedCourse, filters },
  // RTK Query API slices for server state
}
```

### Route Structure (Frontend)
```javascript
// App routing hierarchy  
/login (PublicRoute)
/ (ProtectedRoute)
  ├── / (Home dashboard)
  └── /admin/instructor (Instructor management)
```

### API Route Structure (Backend)
```javascript
// Consistent RESTful API design
/api/v1/auth/* (Authentication)
/api/users/* (User management)  
/api/courses/* (Course operations)
/api/quizzes/* (Quiz management)
/api/assignments/* (Assignment handling)
// + enrollment, progress, certificates, batches, audits
```

### Error Handling Strategy
- **Frontend**: Centralized error handling via RTK Query + toast notifications
- **Backend**: `ApiError` class with consistent error response format
- **Network**: Axios interceptors handle common error scenarios (401, 403, 500)

### File Upload Flow
1. Frontend uploads to Cloudinary via multipart form
2. Backend receives Cloudinary URLs and stores in MongoDB  
3. Models include `{ publicId, url }` structure for media references

This LMS is designed for educational institutions requiring comprehensive course management, student tracking, and assessment capabilities with a modern, responsive admin interface.

## Instructor Management Features

### Admin Panel Capabilities
- **Complete CRUD Operations**: Create, read, update, and delete instructors
- **Batch Assignment**: Assign instructors to specific batches with visual feedback
- **Search & Filter**: Real-time search functionality for instructor management
- **Status Management**: Track instructor status (Active, Suspended, Pending, Banned)
- **Statistics Dashboard**: Overview cards showing total, active, and assigned instructors

### UI Components
- **Modern Table Interface**: Responsive table with avatar display, status badges, and action buttons
- **Modal Dialogs**: Clean forms for adding/editing instructor information
- **Batch Assignment**: Interactive batch selection with current assignment status
- **Pagination**: Handle large instructor lists with pagination controls

### API Integration
- **RTK Query**: Real-time data fetching with automatic cache invalidation
- **Error Handling**: Toast notifications for all operations (success/error)
- **Optimistic Updates**: Immediate UI feedback with server synchronization
