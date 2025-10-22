import { Router } from 'express';
import verifyJWT from '../middlewares/auth.middleware.js';
import authorizeRoles from '../middlewares/authrization.middleware.js';
import { exportCourses, exportBatches, exportStudents } from '../controllers/export.controller.js';

const router = Router();

router.use(verifyJWT);

// Courses and Batches: Admin or SuperAdmin
router.get('/courses', authorizeRoles('ADMIN', 'SUPERADMIN'), exportCourses);
router.get('/batches', authorizeRoles('ADMIN', 'SUPERADMIN'), exportBatches);

// Students: Admin/SuperAdmin can export all; Instructor limited to own batches
router.get('/students', authorizeRoles('ADMIN', 'SUPERADMIN', 'INSTRUCTOR'), exportStudents);

export default router;
