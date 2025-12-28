import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

// Lazy-load layouts and pages to reduce initial bundle size
const HomeLayout = lazy(() => import("./Layout/HomeLayout").then(m => ({ default: m.HomeLayout })));
const InstructorLayout = lazy(() => import("./Layout/InstructorLayout").then(m => ({ default: m.InstructorLayout })));
const SuperAdminLayout = lazy(() => import("./Layout/SuperAdminLayout").then(m => ({ default: m.SuperAdminLayout })));
const StudentLayout = lazy(() => import("./Layout/StudentLayout").then(m => ({ default: m.StudentLayout })));
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
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
const EditModulePage = lazy(() => import("./pages/Admin/EditModulePage"));
const AddCourse = lazy(() => import("./pages/Admin/AddCourse"));
const Departments = lazy(() => import("./pages/Admin/Departments"));
const Students = lazy(() => import("./pages/Admin/Students"));
const DepartmentDetail = lazy(() => import("./pages/Admin/DepartmentDetail"));
const LineDetail = lazy(() => import("./pages/Admin/LineDetail"));
const CourseDetailPage = lazy(() => import("./pages/Admin/CourseDetailPage"));
const AddQuizPage = lazy(() => import("./pages/Admin/AddQuizPage"));
const EditQuizPage = lazy(() => import("./pages/Admin/EditQuizPage"));
const AddAssignmentPage = lazy(() => import("./pages/Admin/AddAssignmentPage"));
const AddResourcePage = lazy(() => import("./pages/Admin/AddResourcePage"));
const AddLessonPage = lazy(() => import("./pages/Admin/AddLessonPage"));
const EditLessonPage = lazy(() => import("./pages/Admin/EditLessonPage"));
const InstructorDetail = lazy(() => import("./pages/Admin/InstructorDetail"));
const StudentDetail = lazy(() => import("./pages/Admin/StudentDetail"));
const Analytics = lazy(() => import("./pages/Admin/Analytics"));
const ExamHistory = lazy(() => import("./pages/Admin/ExamHistory"));
const AdminQuizMonitoring = lazy(() => import("./pages/Admin/QuizMonitoring"));
const AdminAttemptRequests = lazy(() => import("./pages/Admin/AttemptRequests"));
const StudentLevelManagement = lazy(() => import("./pages/Admin/StudentLevelManagement"));
const CertificateTemplates = lazy(() => import("./pages/Admin/CertificateTemplates"));
const ModuleTimelines = lazy(() => import("./pages/Admin/ModuleTimelines"));
const AuditLogs = lazy(() => import("./pages/Admin/AuditLogs"));
const CourseLevelSettings = lazy(() => import("./pages/Admin/CourseLevelSettings"));
const SkillMatrix = lazy(() => import("./pages/Admin/SkillMatrix"));


// Instructor Pages
const InstructorDashboard = lazy(() => import("./pages/Instructor/Dashboard"));
const InstructorCourses = lazy(() => import("./pages/Instructor/Courses"));
const InstructorDepartments = lazy(() => import("./pages/Instructor/Departments"));
const InstructorStudents = lazy(() => import("./pages/Instructor/Students"));
const InstructorStudentDetail = lazy(() => import("./pages/Instructor/StudentDetail"));
const InstructorCourseDetailPage = lazy(() => import("./pages/Instructor/InstructorCourseDetailPage"));
const QuizMonitoring = lazy(() => import("./pages/Instructor/QuizMonitoring"));
const AssignmentMonitoring = lazy(() => import("./pages/Instructor/AssignmentMonitoring"));
const CertificateIssuance = lazy(() => import("./pages/Instructor/CertificateIssuance"));
const InstructorAttemptRequests = lazy(() => import("./pages/Instructor/AttemptRequests"));

// SuperAdmin Pages
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdmin/Dashboard"));
const AllUsersManagement = lazy(() => import("./pages/SuperAdmin/AllUsersManagement"));
const SoftDeletedUsersManagement = lazy(() => import("./pages/SuperAdmin/SoftDeletedUsersManagement"));
const SystemAuditLogs = lazy(() => import("./pages/SuperAdmin/SystemAuditLogs"));
const SystemSettings = lazy(() => import("./pages/SuperAdmin/SystemSettings"));
const AdvancedAnalytics = lazy(() => import("./pages/SuperAdmin/AdvancedAnalytics"));
const DataManagement = lazy(() => import("./pages/SuperAdmin/DataManagement"));
const RolesPermissions = lazy(() => import("./pages/SuperAdmin/RolesPermissions"));
const SystemMonitoring = lazy(() => import("./pages/SuperAdmin/SystemMonitoring"));
const BulkOperations = lazy(() => import("./pages/SuperAdmin/BulkOperations"));
const CertificateManagement = lazy(() => import("./pages/SuperAdmin/CertificateManagement"));

// Student Pages
const StudentDashboard = lazy(() => import("./pages/Student/Dashboard"));
const StudentProfile = lazy(() => import("./pages/Student/Profile"));
const StudentDepartment = lazy(() => import("./pages/Student/Department"));
const DepartmentCourse = lazy(() => import("./pages/Student/DepartmentCourse"));
const LessonDetail = lazy(() => import("./pages/Student/LessonDetail"));
const TakeQuiz = lazy(() => import("./pages/Student/TakeQuiz"));
const CourseReport = lazy(() => import("./pages/Student/CourseReport"));
const Reports = lazy(() => import("./pages/Student/Reports"));
const StudentCertificates = lazy(() => import("./pages/Student/Certificates"));
const ResourcePreview = lazy(() => import("./pages/Student/ResourcePreview"));
const StudentOnJobTraining = lazy(() => import("./pages/Student/OnJobTraining"));

const RoleRedirect = () => {
  const { user } = useSelector((state) => state.auth);
  const role = user?.role;

  if (role === "SUPERADMIN") return <Navigate to="/superadmin" replace />;
  if (role === "ADMIN") return <Navigate to="/admin" replace />;
  if (role === "INSTRUCTOR") return <Navigate to="/trainer" replace />;
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
            <Route path="trainers" element={<Instructor pageName="Instructor" />} />
            <Route path="trainers/:id" element={<InstructorDetail />} />
            <Route path="courses" element={<Course pageName="Courses" />} />
            <Route path="courses/:courseId" element={<CourseDetailPage pageName="Add Modules" />} />
            <Route path="add-course" element={<AddCourse />} />
            <Route path="departments" element={<Departments pageName="Departments" />} />
            <Route path="employees" element={<Students pageName="Employees" />} />
            <Route path="employees/:studentId" element={<StudentDetail />} />
            <Route path="departments/:departmentId" element={<DepartmentDetail pageName="Department Detail" />} />
            <Route path="departments/:departmentId/lines/:lineId" element={<LineDetail />} />
            <Route path="add-quiz/:courseId" element={<AddQuizPage />} />
            <Route path="edit-quiz/:quizId" element={<EditQuizPage />} />
            <Route path="add-module/:courseId" element={<AddModulePage />} />
            <Route path="edit-module/:moduleId" element={<EditModulePage />} />
            <Route path="add-lesson/:moduleId" element={<AddLessonPage />} />
            <Route path="add-assignment/:courseId" element={<AddAssignmentPage />} />
            <Route path="add-resource/:courseId" element={<AddResourcePage />} />
            <Route path="edit-lesson/:moduleId/:lessonId" element={<EditLessonPage />} />
            <Route path="quiz-monitoring" element={<AdminQuizMonitoring />} />
            <Route path="attempt-requests" element={<AdminAttemptRequests />} />
            <Route path="analytics" element={<Analytics pageName="Analytics" />} />
            <Route path="exam-history" element={<ExamHistory />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="student-levels" element={<StudentLevelManagement />} />
            <Route path="certificate-templates" element={<CertificateTemplates pageName="Certificate Templates" />} />
            <Route path="module-timelines" element={<ModuleTimelines pageName="Module Timelines" />} />
            <Route path="course-level-settings" element={<CourseLevelSettings />} />
            <Route path="skill-matrix" element={<SkillMatrix />} />
          </Route>

          {/* Instructor routes */}
          <Route
            path="/trainer"
            element={
              <ProtectedRoute>
                <InstructorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<InstructorDashboard />} />
            <Route path="courses" element={<InstructorCourses />} />
            <Route path="courses/:courseId" element={<InstructorCourseDetailPage />} />
            <Route path="add-module/:courseId" element={<AddModulePage />} />
            <Route path="edit-module/:moduleId" element={<EditModulePage />} />
            <Route path="add-lesson/:moduleId" element={<AddLessonPage />} />
            <Route path="edit-lesson/:moduleId/:lessonId" element={<EditLessonPage />} />
            <Route path="add-quiz/:courseId" element={<AddQuizPage />} />
            <Route path="edit-quiz/:quizId" element={<EditQuizPage />} />
            <Route path="add-assignment/:courseId" element={<AddAssignmentPage />} />
            <Route path="add-resource/:courseId" element={<AddResourcePage />} />
            <Route path="departments" element={<InstructorDepartments />} />
            <Route path="employees" element={<InstructorStudents />} />
            <Route path="employees/:studentId" element={<InstructorStudentDetail />} />
            <Route path="quiz-monitoring" element={<QuizMonitoring />} />
            <Route path="assignment-monitoring" element={<AssignmentMonitoring />} />
            <Route path="certificate-issuance" element={<CertificateIssuance />} />
            <Route path="attempt-requests" element={<InstructorAttemptRequests />} />
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

            {/* User Management Routes */}
            <Route path="all-users" element={<AllUsersManagement />} />
            <Route path="trainers" element={<Instructor pageName="Instructors" />} />
            <Route path="trainers/:id" element={<InstructorDetail />} />
            <Route path="employees" element={<Students pageName="Employees" />} />
            <Route path="employees/:studentId" element={<StudentDetail />} />
            <Route path="soft-deleted-users" element={<SoftDeletedUsersManagement />} />
            <Route path="roles-permissions" element={<RolesPermissions />} />

            {/* Content Management Routes */}
            <Route path="courses" element={<Course pageName="Courses" />} />
            <Route path="courses/:courseId" element={<CourseDetailPage pageName="Course Management" />} />
            <Route path="add-course" element={<AddCourse />} />
            <Route path="add-quiz/:courseId" element={<AddQuizPage />} />
            <Route path="add-module/:courseId" element={<AddModulePage />} />
            <Route path="add-lesson/:moduleId" element={<AddLessonPage />} />
            <Route path="add-assignment/:courseId" element={<AddAssignmentPage />} />
            <Route path="add-resource/:courseId" element={<AddResourcePage />} />
            <Route path="edit-lesson/:moduleId/:lessonId" element={<EditLessonPage />} />
            <Route path="departments" element={<Departments pageName="Departments" />} />
            <Route path="departments/:departmentId" element={<DepartmentDetail pageName="Department Detail" />} />
            <Route path="departments/:departmentId/lines/:lineId" element={<LineDetail />} />
            <Route path="certificates" element={<CertificateManagement />} />
            <Route path="module-timelines" element={<ModuleTimelines pageName="Module Timelines" />} />

            {/* System Management Routes */}
            <Route path="audit-logs" element={<SystemAuditLogs />} />
            <Route path="system-settings" element={<SystemSettings />} />
            <Route path="analytics-reports" element={<AdvancedAnalytics />} />
            <Route path="system-monitoring" element={<SystemMonitoring />} />

            {/* Advanced Operations Routes */}
            <Route path="data-management" element={<DataManagement />} />
            <Route path="bulk-operations" element={<BulkOperations />} />

            {/* Legacy Routes for Compatibility */}
            <Route path="student-levels" element={<StudentLevelManagement />} />
            <Route path="certificate-templates" element={<CertificateTemplates pageName="Certificate Templates" />} />
            <Route path="course-level-settings" element={<CourseLevelSettings />} />
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
            <Route path="profile" element={<StudentProfile />} />
            <Route path="department" element={<StudentDepartment />} />
            <Route path="course" element={<DepartmentCourse />} />
            <Route path="lesson/:lessonId" element={<LessonDetail />} />
            <Route path="quiz/:quizId" element={<TakeQuiz />} />
            <Route path="reports" element={<Reports />} />
            <Route path="report/:courseId" element={<CourseReport />} />
            <Route path="certificates" element={<StudentCertificates />} />
            <Route path="on-job-training" element={<StudentOnJobTraining />} />
            <Route path="resource-preview/:resourceId" element={<ResourcePreview />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
