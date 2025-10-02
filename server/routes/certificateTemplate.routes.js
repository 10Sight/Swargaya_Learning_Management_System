import { Router } from "express";
import {
    createCertificateTemplate,
    getCertificateTemplates,
    getCertificateTemplateById,
    getDefaultCertificateTemplate,
    updateCertificateTemplate,
    deleteCertificateTemplate,
    setDefaultCertificateTemplate,
} from "../controllers/certificateTemplate.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

// Admin only routes
router.post("/", verifyJWT, authorizeRoles("ADMIN"), createCertificateTemplate);
router.get("/", verifyJWT, authorizeRoles("ADMIN"), getCertificateTemplates);
router.get("/default", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getDefaultCertificateTemplate);
router.get("/:id", verifyJWT, authorizeRoles("ADMIN"), getCertificateTemplateById);
router.put("/:id", verifyJWT, authorizeRoles("ADMIN"), updateCertificateTemplate);
router.delete("/:id", verifyJWT, authorizeRoles("ADMIN"), deleteCertificateTemplate);
router.patch("/:id/set-default", verifyJWT, authorizeRoles("ADMIN"), setDefaultCertificateTemplate);

export default router;
