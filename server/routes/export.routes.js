import { Router } from 'express';
import verifyJWT from '../middlewares/auth.middleware.js';
import authorizeRoles from '../middlewares/authrization.middleware.js';
import { exportCourses, exportDepartments, exportStudents } from '../controllers/export.controller.js';

const router = Router();

router.use(verifyJWT);

// Courses and Departments: Admin or SuperAdmin
router.get('/courses', authorizeRoles('ADMIN', 'SUPERADMIN'), exportCourses);
router.get('/departments', authorizeRoles('ADMIN', 'SUPERADMIN'), exportDepartments);

// Students: Admin/SuperAdmin can export all; Instructor limited to own departments
router.get('/students', authorizeRoles('ADMIN', 'SUPERADMIN', 'INSTRUCTOR'), exportStudents);

export default router;
