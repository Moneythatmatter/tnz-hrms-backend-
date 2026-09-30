import { Router } from "express";
import * as auth from "../controllers/auth/auth.controller.js";

const router = Router();

router.post("/login", auth.login);
router.post("/employee-login", auth.employeeLogin);
router.get("/me", auth.me);

export default router;
