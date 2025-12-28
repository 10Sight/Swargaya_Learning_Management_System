import { Router } from "express";
import {
    createMachine,
    getMachinesByLine,
    updateMachine,
    deleteMachine
} from "../controllers/machine.controller.js";

const router = Router();

router.post("/", createMachine);
router.get("/line/:lineId", getMachinesByLine);
router.put("/:id", updateMachine);
router.delete("/:id", deleteMachine);

export default router;
