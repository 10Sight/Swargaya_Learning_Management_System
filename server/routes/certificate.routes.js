import { Router } from "express";
import { 
    issueCertificate, 
    getCertificateById, 
    getStudentCertificates, 
    getCourseCertificates, 
    revokeCertificate,
    checkCertificateEligibility,
    issueCertificateWithTemplate,
    generateCertificatePreview
} from "../controllers/certificate.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

// Existing routes
router.post("/", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN", "INSTRUCTOR"), issueCertificate);
router.get("/student", verifyJWT, authorizeRoles("STUDENT"), getStudentCertificates);
router.get("/course/:courseId", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN", "INSTRUCTOR"), getCourseCertificates);
router.get("/:id", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN", "INSTRUCTOR", "STUDENT"), getCertificateById);
router.delete("/:id", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN", "INSTRUCTOR"), revokeCertificate);

// Certificate workflow routes (SuperAdmin, Admin, and Instructor access)
router.get("/check-eligibility/:studentId/:courseId", verifyJWT, authorizeRoles("SUPERADMIN", "ADMIN", "INSTRUCTOR"), checkCertificateEligibility);
router.post("/issue-with-template", verifyJWT, authorizeRoles("SUPERADMIN", "ADMIN", "INSTRUCTOR"), issueCertificateWithTemplate);
router.post("/preview", verifyJWT, authorizeRoles("SUPERADMIN", "ADMIN", "INSTRUCTOR"), generateCertificatePreview);

export default router;
