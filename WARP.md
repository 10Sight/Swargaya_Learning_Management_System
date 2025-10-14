# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a full-stack Learning Management System (LMS) built with Node.js/Express backend and React frontend. The system supports three user roles: ADMIN, INSTRUCTOR, STUDENT, and SUPERADMIN with role-based access control and real-time notifications via Socket.IO.

## Architecture

### Backend (Node.js/Express)
- **Server**: Express server with Socket.IO integration for real-time features
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based auth with refresh tokens
- **File Storage**: Cloudinary integration for media files
- **Performance**: Compression, caching, and optimized database queries with indexes

### Frontend (React/Vite)
- **Framework**: React 19 with Vite build system
- **State Management**: Redux Toolkit with React-Redux
- **UI Library**: Radix UI components with Tailwind CSS
- **Code Splitting**: React.lazy() with role-based chunks
- **Real-time**: Socket.IO client integration

### Key Features
- **Multi-role Dashboard**: Separate layouts and workflows for each user type
- **Course Management**: Hierarchical structure (Courses → Modules → Lessons)
- **Assessment System**: Quizzes and assignments with monitoring
- **Progress Tracking**: Student progress and analytics
- **Certificate Management**: Template-based certificate generation
- **Real-time Notifications**: Socket.IO powered live updates
- **Batch System**: Group-based learning management

## Development Commands

### Server (from /server)
```bash
# Start development server with hot reload
npm run dev
# or
npm start

# Both use nodemon for auto-restart on changes
```

### Client (from /admin)
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Testing
```bash
# Test server health
curl -H "Accept-Encoding: gzip" http://localhost:5000/api/health -v

# Test Socket.IO connection
# Open browser console and check for connection messages after login
```

## Environment Setup

### Server Environment (.env)
```env
MONGO_URI=mongodb://localhost:27017/learning_management_system
JWT_SECRET=your-super-secret-jwt-access-key-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-here
JWT_REFRESH_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password-here
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
FRONTEND_URL=http://localhost:5173
```

### Client Environment (admin/.env)
```env
VITE_SERVER_URL=http://localhost:5000
VITE_SOCKET_DEBUG=true  # For debugging Socket.IO
```

## Database Structure

### Core Models
- **User**: Multi-role user system (ADMIN, INSTRUCTOR, STUDENT, SUPERADMIN)
- **Course**: Course content with modules, quizzes, assignments, and resources
- **Batch**: Student groupings linked to courses and instructors
- **Module**: Course content containers with lessons
- **Lesson**: Individual learning units with content and resources
- **Quiz/Assignment**: Assessment tools with submissions and grading
- **Progress**: Student progress tracking across courses
- **Certificate**: Template-based certificate generation and issuance

### Key Relationships
- Users belong to batches (many-to-one)
- Instructors are assigned to specific batches (one-to-one validation)
- Courses have multiple modules, quizzes, assignments, and resources
- Students enroll in courses through batch membership
- Progress is tracked per student per course

## Socket.IO Integration

### Server-Side Events
- **Authentication**: Users join batch and user-specific rooms
- **Quiz Events**: quiz-started, quiz-submitted notifications
- **Assignment Events**: assignment-created, assignment-submitted notifications
- **General**: send-notification, typing indicators, user join/leave

### Client-Side Integration
- **Context**: SocketContext provides hooks for real-time functionality
- **UI Component**: NotificationCenter shows live notifications with toast messages
- **Auto-connection**: Socket connects automatically when user is authenticated

### Room Structure
- `batch-{batchId}`: All users in a specific batch
- `user-{userId}`: Direct notifications to specific users
- `course-{courseId}`: Course-specific notifications

## File Structure

### Server Key Directories
```
server/
├── controllers/        # API endpoint handlers
├── models/            # Mongoose schemas
├── routes/            # Express route definitions
├── middleware/        # Auth, upload, validation middleware
├── utils/            # Utility functions including socketIO.js
├── configs/          # Environment and service configurations
├── db/              # Database connection
└── logger/          # Winston logging setup
```

### Client Key Directories
```
admin/src/
├── pages/           # Route components organized by role
├── Layout/          # Layout components for each role
├── components/      # Reusable UI components
├── contexts/        # React contexts (Socket, etc.)
├── Redux/           # State management
└── Helper/          # API utilities and axios configuration
```

## Performance Optimizations

### Backend
- Database indexes on frequently queried fields (email, role, batch, title, category, status)
- `.lean()` queries for read-only operations (30-50% faster)
- gzip/deflate compression (60-80% smaller responses)
- Security headers and CORS optimization
- Connection pooling and optimized populate fields

### Frontend
- Code splitting with React.lazy() by user role (50-70% faster initial loads)
- Vite build optimization with manual chunk splitting
- Vendor, UI, Redux, and route-based chunks for better caching
- CSS code splitting and asset optimization
- Pre-bundling of heavy dependencies

## Development Guidelines

### API Patterns
- RESTful endpoints following `/api/{resource}` structure
- JWT authentication required for protected routes
- Role-based authorization middleware
- Consistent error handling with proper HTTP status codes
- Request validation and sanitization

### Frontend Patterns
- Role-based route protection and layout rendering
- Redux for global state (auth, user data)
- Context for specific features (Socket.IO)
- Radix UI components with Tailwind styling
- Suspense boundaries for lazy-loaded components

### Real-time Features
- Use socketIOService utility for server-side events
- Follow established room naming conventions
- Handle connection states and reconnection
- Implement proper error handling and fallbacks
- Memory management (max 50 notifications per user)

## Common Development Tasks

### Adding New API Endpoints
1. Create route handler in appropriate controller file
2. Add route definition in corresponding routes file
3. Include route in server/index.js
4. Update client-side API calls in Helper/axiosInstance.js

### Adding Real-time Features
1. Add server-side event handler in server/utils/socketIO.js
2. Add client-side event listener in admin/src/contexts/SocketContext.jsx
3. Update UI components to handle real-time data
4. Test with multiple browser tabs/users

### Role-based Feature Development
1. Add route protection in respective layout components
2. Update navigation components for role-specific access
3. Implement role-based UI rendering
4. Add authorization checks in backend controllers

### Database Changes
1. Update Mongoose models with proper indexing
2. Add validation and pre/post hooks as needed
3. Update controllers to use optimized queries (.lean() for reads)
4. Test with existing data for migration compatibility

## CORS and Deployment

### Development CORS Origins
```javascript
[
  "http://localhost:5173",
  "http://localhost:5174", 
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177"
]
```

### Production Deployment
- Update CORS origins to production domain
- Set NODE_ENV=production
- Configure proper environment variables
- Enable SSL/TLS for Socket.IO connections
- Monitor performance and error logs

## Dependencies

### Server Key Dependencies
- express: Web framework
- mongoose: MongoDB ODM
- socket.io: Real-time communication
- jsonwebtoken: JWT authentication
- bcryptjs: Password hashing
- cloudinary: File storage
- compression: Response compression
- nodemailer: Email functionality

### Client Key Dependencies
- react/react-dom: UI framework
- @reduxjs/toolkit: State management
- react-router-dom: Routing
- axios: HTTP client
- socket.io-client: Real-time client
- @radix-ui: UI component library
- tailwindcss: CSS framework
- lucide-react: Icon library
