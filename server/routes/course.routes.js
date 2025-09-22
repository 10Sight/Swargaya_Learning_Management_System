import { Router } from "express";
import { 
    createCourse, 
    getCourses, 
    getCourseById, 
    updatedCourse, 
    deleteCourse, 
    togglePublishCourse 
} from "../controllers/course.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), createCourse);
router.get("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getCourses);
router.get("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getCourseById);
router.put("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), updatedCourse);
router.delete("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), deleteCourse);
router.patch("/:id/toggle-publish", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), togglePublishCourse);

export default router;
