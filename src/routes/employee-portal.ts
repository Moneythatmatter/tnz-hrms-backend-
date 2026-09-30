import { Router } from "express";
import * as portal from "../controllers/employee-portal/index.js";
import { requireAuth } from "../middleware/auth.js";
import { requireEmployee } from "../middleware/employee.js";
import { attachRequestContext } from "../middleware/request-context.js";

const router = Router();

router.use(requireAuth);
router.use(requireEmployee);
router.use(attachRequestContext);

router.get("/dashboard", portal.getDashboard);
router.get("/profile", portal.getProfile);

router.get("/attendance", portal.listAttendance);
router.get("/attendance/today", portal.getAttendanceToday);
router.post("/attendance/punch-in", portal.punchIn);
router.post("/attendance/punch-out", portal.punchOut);

router.get("/schedule", portal.getSchedule);
router.get("/holidays", portal.listHolidays);

router.get("/leave/balance", portal.getLeaveBalance);
router.get("/leave/applications", portal.listLeaveApplications);
router.get("/leave/types", portal.listLeaveTypes);
router.post("/leave/applications/preview-days", portal.previewLeaveDays);
router.post("/leave/applications", portal.createLeaveApplication);

router.get("/overtime", portal.listOvertime);
router.get("/payslips", portal.listPayslips);
router.get("/payslips/:id/download", portal.downloadPayslip);

export default router;
