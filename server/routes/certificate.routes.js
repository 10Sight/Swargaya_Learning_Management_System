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
router.post("/", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), issueCertificate);
router.get("/student", verifyJWT, authorizeRoles("STUDENT"), getStudentCertificates);
router.get("/course/:courseId", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getCourseCertificates);
router.get("/:id", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR", "STUDENT"), getCertificateById);
router.delete("/:id", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), revokeCertificate);

// New instructor workflow routes
router.get("/check-eligibility/:studentId/:courseId", verifyJWT, authorizeRoles("INSTRUCTOR"), checkCertificateEligibility);
router.post("/issue-with-template", verifyJWT, authorizeRoles("INSTRUCTOR"), issueCertificateWithTemplate);
router.post("/preview", verifyJWT, authorizeRoles("INSTRUCTOR"), generateCertificatePreview);

export default router;
