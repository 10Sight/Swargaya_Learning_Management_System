import { Router } from "express";
import { login, logout, profile, register } from "../controllers/auth.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/logout", verifyJWT, logout);
router.get("/profile", verifyJWT, profile);

export default router;