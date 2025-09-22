import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HomeLayout } from "./Layout/HomeLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Instructor from "./pages/Admin/Instructor";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Course from "./pages/Admin/Couse";
import AddModulePage from "./pages/Admin/AddModulePage";
import AddCourse from "./pages/Admin/AddCourse";
import Batches from "./pages/Admin/Batches";
import Students from "./pages/Admin/Students";
import BatchDetail from "./pages/Admin/BatchDetail";
import CourseDetailPage from "./pages/Admin/CourseDetailPage";
import AddQuizPage from "./pages/Admin/AddQuizPage";
import AddAssignmentPage from "./pages/Admin/AddAssignmentPage";
import AddResourcePage from "./pages/Admin/AddResourcePage";
import InstructorDetail from "./pages/Admin/InstructorDetail";

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

        {/* Protected routes wrapped in HomeLayout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomeLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route
            path="admin/instructor"
            element={<Instructor pageName="Instructor" />}
          />
          <Route path="admin/instructor/:id" element={<InstructorDetail />} />
          <Route path="admin/courses" element={<Course pageName="Courses" />} />
          <Route
            path="admin/courses/:courseId"
            element={<CourseDetailPage pageName="Add Modules" />}
          />
          <Route path="admin/add-course" element={<AddCourse />} />
          <Route
            path="admin/batches"
            element={<Batches pageName="Batches" />}
          />
          <Route
            path="admin/students"
            element={<Students pageName="Students" />}
          />
          <Route
            path="/admin/batches/:batchId"
            element={<BatchDetail pageName="Batch Detail" />}
          />
          <Route path="/admin/add-quiz/:courseId" element={<AddQuizPage />} />
          <Route
            path="/admin/add-module/:courseId"
            element={<AddModulePage />}
          />
          <Route
            path="/admin/add-assignment/:courseId"
            element={<AddAssignmentPage />}
          />
          <Route
            path="/admin/add-resource/:courseId"
            element={<AddResourcePage />}
          />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
