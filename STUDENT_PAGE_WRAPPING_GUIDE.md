# Student Page Account Status Wrapping Guide

## Overview

To complete the account status restriction implementation, you need to wrap the remaining student pages with the `AccountStatusWrapper` component. This guide shows you how to do it.

## Completed Pages

The following pages have already been wrapped:

1. **Dashboard** (`/student`) - `allowPending={false}` - Full restrictions for pending users
2. **Profile** (`/student/profile`) - `allowPending={true}` - Accessible by pending users
3. **Batch** (`/student/batch`) - `allowPending={false}` - Restricted for pending users

## Pages that Need Wrapping

### 1. BatchCourse (`/student/course`) - High Priority
- Should use `allowPending={false}`
- This is the main course content page

### 2. Reports (`/student/reports`) - High Priority  
- Should use `allowPending={false}`
- Contains student progress data

### 3. CourseReport (`/student/report/:courseId`) - High Priority
- Should use `allowPending={false}`
- Shows individual course completion reports

### 4. StudentCertificates (`/student/certificates`) - High Priority
- Should use `allowPending={false}`
- Certificate downloads and viewing

### 5. LessonDetail (`/student/lesson/:lessonId`) - High Priority
- Should use `allowPending={false}`
- Individual lesson content

### 6. TakeQuiz (`/student/quiz/:quizId`) - High Priority
- Should use `allowPending={false}`
- Quiz taking functionality

## How to Wrap a Page

### Step 1: Import the Wrapper
```javascript
import AccountStatusWrapper from '../../components/student/AccountStatusWrapper';
```

### Step 2: Wrap the Return Statement
For pages that should be restricted for pending users:
```javascript
return (
  <AccountStatusWrapper allowPending={false}>
    {/* existing page content */}
  </AccountStatusWrapper>
);
```

For pages that should allow pending users (like Profile):
```javascript
return (
  <AccountStatusWrapper allowPending={true}>
    {/* existing page content */}
  </AccountStatusWrapper>
);
```

### Step 3: Handle Loading/Error States
Make sure loading and error states are NOT wrapped (they should render regardless of account status):

```javascript
// ✅ CORRECT - Don't wrap loading states
if (loading) {
  return <LoadingComponent />;
}

if (error) {
  return <ErrorComponent />;
}

// ✅ CORRECT - Only wrap the main content
return (
  <AccountStatusWrapper allowPending={false}>
    <div>
      {/* main content */}
    </div>
  </AccountStatusWrapper>
);
```

## Account Status Behavior

### ACTIVE Users
- Can access all pages normally

### PENDING Users  
- Can only access pages with `allowPending={true}` (currently just Profile)
- All other pages show: "Your account is currently pending approval. You can only access your profile page at this time. Please contact your instructor for more information."

### SUSPENDED Users
- Cannot access ANY student pages
- All pages show: "Your account has been suspended. Please contact your instructor for more information."

### BANNED Users
- Cannot access ANY student pages  
- All pages show: "Your account has been banned. Please contact your instructor for more information."

## Quick Implementation Template

Here's a template for quickly wrapping any student page:

```javascript
import React from 'react';
// ... other imports
import AccountStatusWrapper from '../../components/student/AccountStatusWrapper';

const YourStudentPage = () => {
  // ... existing logic

  // Don't wrap loading/error states
  if (loading) {
    return <LoadingComponent />;
  }

  if (error) {
    return <ErrorComponent />;
  }

  // Wrap main content
  return (
    <AccountStatusWrapper allowPending={false}> {/* Set to true only for Profile-like pages */}
      {/* Move ALL existing JSX content here */}
    </AccountStatusWrapper>
  );
};

export default YourStudentPage;
```

## Testing

After wrapping pages, test with different account statuses:

1. **ACTIVE** - Should work normally
2. **PENDING** - Should only access Profile page  
3. **SUSPENDED** - Should see suspension message on all pages
4. **BANNED** - Should see banned message on all pages

You can test by temporarily changing a user's status in the database or admin panel.

## Backend is Already Complete

The backend middleware has been implemented and applied to all relevant routes:
- ✅ Authentication routes (profile allows pending)
- ✅ Batch routes (some allow pending, others don't)
- ✅ Progress routes (most restricted for pending)
- ✅ Quiz routes (all restricted for pending)
- ✅ Assignment routes (all restricted for pending)

The frontend wrappers provide the user-friendly interface for the backend restrictions.
