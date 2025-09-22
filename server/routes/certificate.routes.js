import { Router } from "express";
import { 
    issueCertificate, 
    getCertificateById, 
    getStudentCertificates, 
    getCourseCertificates, 
    revokeCertificate 
} from "../controllers/certificate.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), issueCertificate);
router.get("/student", verifyJWT, authorizeRoles("STUDENT"), getStudentCertificates);
router.get("/course/:courseId", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getCourseCertificates);
router.get("/:id", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR", "STUDENT"), getCertificateById);
router.delete("/:id", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), revokeCertificate);

export default router;
