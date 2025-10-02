import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

// Core components that should load immediately
import { HomeLayout } from "./Layout/HomeLayout";
import { InstructorLayout } from "./Layout/InstructorLayout";
import { SuperAdminLayout } from "./Layout/SuperAdminLayout";
import { StudentLayout } from "./Layout/StudentLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Lazy load heavy page components for code splitting
// Admin Pages
const Instructor = lazy(() => import("./pages/Admin/Instructor"));
const Course = lazy(() => import("./pages/Admin/Course"));
const AddModulePage = lazy(() => import("./pages/Admin/AddModulePage"));
const AddCourse = lazy(() => import("./pages/Admin/AddCourse"));
const Batches = lazy(() => import("./pages/Admin/Batches"));
const Students = lazy(() => import("./pages/Admin/Students"));
const BatchDetail = lazy(() => import("./pages/Admin/BatchDetail"));
const CourseDetailPage = lazy(() => import("./pages/Admin/CourseDetailPage"));
const AddQuizPage = lazy(() => import("./pages/Admin/AddQuizPage"));
const AddAssignmentPage = lazy(() => import("./pages/Admin/AddAssignmentPage"));
const AddResourcePage = lazy(() => import("./pages/Admin/AddResourcePage"));
const AddLessonPage = lazy(() => import("./pages/Admin/AddLessonPage"));
const InstructorDetail = lazy(() => import("./pages/Admin/InstructorDetail"));
const StudentDetail = lazy(() => import("./pages/Admin/StudentDetail"));
const Analytics = lazy(() => import("./pages/Admin/Analytics"));
const StudentLevelManagement = lazy(() => import("./pages/Admin/StudentLevelManagement"));
const CertificateTemplates = lazy(() => import("./pages/Admin/CertificateTemplates"));

// Instructor Pages
const InstructorDashboard = lazy(() => import("./pages/Instructor/Dashboard"));
const InstructorCourses = lazy(() => import("./pages/Instructor/Courses"));
const InstructorBatches = lazy(() => import("./pages/Instructor/Batches"));
const InstructorStudents = lazy(() => import("./pages/Instructor/Students"));
const InstructorCourseDetailPage = lazy(() => import("./pages/Instructor/InstructorCourseDetailPage"));
const QuizMonitoring = lazy(() => import("./pages/Instructor/QuizMonitoring"));
const AssignmentMonitoring = lazy(() => import("./pages/Instructor/AssignmentMonitoring"));
const CertificateIssuance = lazy(() => import("./pages/Instructor/CertificateIssuance"));

// SuperAdmin Pages
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdmin/Dashboard"));

// Student Pages
const StudentDashboard = lazy(() => import("./pages/Student/Dashboard"));
const StudentBatch = lazy(() => import("./pages/Student/Batch"));
const BatchCourse = lazy(() => import("./pages/Student/BatchCourse"));
const LessonDetail = lazy(() => import("./pages/Student/LessonDetail"));
const TakeQuiz = lazy(() => import("./pages/Student/TakeQuiz"));
const CourseReport = lazy(() => import("./pages/Student/CourseReport"));
const Reports = lazy(() => import("./pages/Student/Reports"));
const StudentCertificates = lazy(() => import("./pages/Student/Certificates"));

const RoleRedirect = () => {
  const { user } = useSelector((state) => state.auth);
  const role = user?.role;

  if (role === "SUPERADMIN") return <Navigate to="/superadmin" replace />;
  if (role === "ADMIN") return <Navigate to="/admin" replace />;
  if (role === "INSTRUCTOR") return <Navigate to="/instructor" replace />;
  // default to student
  return <Navigate to="/student" replace />;
};

const App = () => {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Public route for login */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Role landing that redirects to the correct base by role */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleRedirect />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <HomeLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="instructor" element={<Instructor pageName="Instructor" />} />
          <Route path="instructor/:id" element={<InstructorDetail />} />
          <Route path="courses" element={<Course pageName="Courses" />} />
          <Route path="courses/:courseId" element={<CourseDetailPage pageName="Add Modules" />} />
          <Route path="add-course" element={<AddCourse />} />
          <Route path="batches" element={<Batches pageName="Batches" />} />
          <Route path="students" element={<Students pageName="Students" />} />
          <Route path="students/:studentId" element={<StudentDetail />} />
          <Route path="batches/:batchId" element={<BatchDetail pageName="Batch Detail" />} />
          <Route path="add-quiz/:courseId" element={<AddQuizPage />} />
          <Route path="add-module/:courseId" element={<AddModulePage />} />
          <Route path="add-lesson/:moduleId" element={<AddLessonPage />} />
          <Route path="add-assignment/:courseId" element={<AddAssignmentPage />} />
          <Route path="add-resource/:courseId" element={<AddResourcePage />} />
          <Route path="analytics" element={<Analytics pageName="Analytics" />} />
          <Route path="student-levels" element={<StudentLevelManagement />} />
          <Route path="certificate-templates" element={<CertificateTemplates pageName="Certificate Templates" />} />
        </Route>

        {/* Instructor routes */}
        <Route
          path="/instructor"
          element={
            <ProtectedRoute>
              <InstructorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<InstructorDashboard />} />
          <Route path="courses" element={<InstructorCourses />} />
          <Route path="courses/:courseId" element={<InstructorCourseDetailPage />} />
          <Route path="batches" element={<InstructorBatches />} />
          <Route path="students" element={<InstructorStudents />} />
          <Route path="quiz-monitoring" element={<QuizMonitoring />} />
          <Route path="assignment-monitoring" element={<AssignmentMonitoring />} />
          <Route path="certificate-issuance" element={<CertificateIssuance />} />
        </Route>

        {/* SuperAdmin routes */}
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute>
              <SuperAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SuperAdminDashboard />} />
          {/* Reuse admin pages for now */}
          <Route path="instructor" element={<Instructor pageName="Instructor" />} />
          <Route path="instructor/:id" element={<InstructorDetail />} />
          <Route path="courses" element={<Course pageName="Courses" />} />
          <Route path="courses/:courseId" element={<CourseDetailPage pageName="Add Modules" />} />
          <Route path="batches" element={<Batches pageName="Batches" />} />
          <Route path="students" element={<Students pageName="Students" />} />
          <Route path="students/:studentId" element={<StudentDetail />} />
          <Route path="batches/:batchId" element={<BatchDetail pageName="Batch Detail" />} />
          <Route path="student-levels" element={<StudentLevelManagement />} />
          <Route path="certificate-templates" element={<CertificateTemplates pageName="Certificate Templates" />} />
        </Route>

        {/* Student routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="batch" element={<StudentBatch />} />
          <Route path="course" element={<BatchCourse />} />
          <Route path="lesson/:lessonId" element={<LessonDetail />} />
          <Route path="quiz/:quizId" element={<TakeQuiz />} />
          <Route path="reports" element={<Reports />} />
          <Route path="report/:courseId" element={<CourseReport />} />
          <Route path="certificates" element={<StudentCertificates />} />
        </Route>
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
