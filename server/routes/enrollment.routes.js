import { Router } from "express";
import { 
    enrollStudent, 
    unenrollStudent, 
    getAllEnrollments, 
    getStudentEnrollments, 
    getCourseEnrollments, 
    updateEnrollment, 
    deleteEnrollment 
} from "../controllers/enrollment.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";
import checkAccountStatus from "../middlewares/accountStatus.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), enrollStudent);
router.post("/unenroll", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), unenrollStudent);
router.get("/", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getAllEnrollments);
router.get("/student/:studentId", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR", "STUDENT"), checkAccountStatus(true), getStudentEnrollments);
router.get("/course/:courseId", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getCourseEnrollments);
router.put("/:id", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), updateEnrollment);
router.delete("/:id", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), deleteEnrollment);

export default router;
