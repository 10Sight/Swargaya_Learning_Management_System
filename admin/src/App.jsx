import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HomeLayout } from "./Layout/HomeLayout";
import { InstructorLayout } from "./Layout/InstructorLayout";
import { SuperAdminLayout } from "./Layout/SuperAdminLayout";
import { StudentLayout } from "./Layout/StudentLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Instructor from "./pages/Admin/Instructor";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Course from "./pages/Admin/Course";
import AddModulePage from "./pages/Admin/AddModulePage";
import AddCourse from "./pages/Admin/AddCourse";
import Batches from "./pages/Admin/Batches";
import Students from "./pages/Admin/Students";
import BatchDetail from "./pages/Admin/BatchDetail";
import CourseDetailPage from "./pages/Admin/CourseDetailPage";
import AddQuizPage from "./pages/Admin/AddQuizPage";
import AddAssignmentPage from "./pages/Admin/AddAssignmentPage";
import AddResourcePage from "./pages/Admin/AddResourcePage";
import AddLessonPage from "./pages/Admin/AddLessonPage";
import InstructorDetail from "./pages/Admin/InstructorDetail";
import StudentDetail from "./pages/Admin/StudentDetail";
import Analytics from "./pages/Admin/Analytics";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import InstructorDashboard from "./pages/Instructor/Dashboard";
import InstructorCourses from "./pages/Instructor/Courses";
import InstructorBatches from "./pages/Instructor/Batches";
import InstructorStudents from "./pages/Instructor/Students";
import InstructorCourseDetailPage from "./pages/Instructor/InstructorCourseDetailPage";
import QuizMonitoring from "./pages/Instructor/QuizMonitoring";
import AssignmentMonitoring from "./pages/Instructor/AssignmentMonitoring";
import SuperAdminDashboard from "./pages/SuperAdmin/Dashboard";
import StudentDashboard from "./pages/Student/Dashboard";
import StudentBatch from "./pages/Student/Batch";
import BatchCourse from "./pages/Student/BatchCourse";
import LessonDetail from "./pages/Student/LessonDetail";
import TakeQuiz from "./pages/Student/TakeQuiz";

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
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
