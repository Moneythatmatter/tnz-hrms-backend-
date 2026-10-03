import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { hrPermissionGuard } from "../middleware/permissions.js";
import { attachRequestContext } from "../middleware/request-context.js";
import { createTableCrud, mountCrud } from "../controllers/shared-crud.js";
import { hrTables } from "../models/human-resources/index.js";
import { getDashboard } from "../controllers/human-resources/dashboard.js";
import * as employees from "../controllers/human-resources/employees.js";
import * as payroll from "../controllers/human-resources/payroll.js";
import * as payslips from "../controllers/human-resources/payslips.js";
import * as attendance from "../controllers/human-resources/attendance.js";
import * as leaveApplications from "../controllers/human-resources/leave-applications.js";
import * as weeklyOffs from "../controllers/human-resources/weekly-offs.js";
import * as compensation from "../controllers/human-resources/compensation.js";

const router = Router();

router.use(requireAuth);
router.use(attachRequestContext);
router.use(hrPermissionGuard);

router.get("/dashboard", getDashboard);

// Employees (enriched)
router.get("/employees", employees.listEmployees);
router.get("/employees/:id", employees.getEmployee);
router.post("/employees", employees.createEmployee);
router.put("/employees/:id", employees.updateEmployee);
router.patch("/employees/:id", employees.updateEmployee);
router.delete("/employees/:id", employees.deleteEmployee);

// Compensation revisions & bonuses
router.get("/compensation/revisions", compensation.listAllCompensationRevisions);
router.post(
  "/compensation/revisions/:revisionId/approve",
  compensation.approveCompensationRevisionById,
);
router.get("/employees/:employeeId/compensation", compensation.getCompensationSummary);
router.get("/employees/:employeeId/compensation/revisions", compensation.listCompensationRevisions);
router.post("/employees/:employeeId/compensation/initial", compensation.createInitialCompensation);
router.post("/employees/:employeeId/compensation/preview", compensation.previewCompensationIncrement);
router.post("/employees/:employeeId/compensation/revisions", compensation.submitCompensationRevision);
router.post(
  "/employees/:employeeId/compensation/revisions/:revisionId/approve",
  compensation.approveCompensationRevision,
);
router.get("/employees/:employeeId/bonus-awards", compensation.listBonusAwards);
router.post("/employees/:employeeId/bonus-awards", compensation.createBonusAward);

// Leave applications ops
router.post("/leave-applications/preview-days", leaveApplications.previewLeaveDays);
router.post("/leave-applications/:id/approve", leaveApplications.approveLeaveApplication);
router.post("/leave-applications/:id/reject", leaveApplications.rejectLeaveApplication);
router.post("/leave-applications/:id/cancel", leaveApplications.cancelLeaveApplication);
router.post("/leave-applications/:id/modify", leaveApplications.modifyLeaveApplication);

// Payroll ops
router.get("/payroll/audit-logs", payroll.listAuditLogs);
router.get("/payroll/summary", payroll.getPayrollSummary);
router.get("/payroll/records", payroll.listPayrollRecords);
router.post("/payroll/records/calculate", payroll.calculatePayroll);
router.post("/payroll/records/verify-batch", payroll.verifyPayrollBatch);
router.post("/payroll/records/approve-batch", payroll.approvePayrollBatch);
router.get("/payroll/records/:id", payroll.getPayrollRecord);
router.post("/payroll/records", payroll.createPayrollRecord);
router.put("/payroll/records/:id", payroll.updatePayrollRecord);
router.patch("/payroll/records/:id", payroll.updatePayrollRecord);
router.post("/payroll/records/:id/verify", payroll.verifyPayrollRecord);
router.post("/payroll/records/:id/approve", payroll.approvePayrollRecord);
router.post("/payroll/records/:id/unlock", payroll.unlockPayrollRecord);
router.get("/payroll/records/:id/payments", payroll.listSalaryPayments);
router.post("/payroll/records/:id/payments", payroll.recordSalaryPayment);

// Payslip delivery (generate happens automatically on payroll approval)
router.post("/payslips/send-batch", payslips.sendPayslipsBatchHandler);
router.post("/payslips/:id/send", payslips.sendOnePayslip);

// Attendance ops
router.get("/attendance/daily", attendance.getDailyAttendance);
router.get("/attendance/employee/:id", attendance.getEmployeeAttendance);
router.post("/attendance/punch-in", attendance.punchIn);
router.post("/attendance/punch-out", attendance.punchOut);

// Weekly offs ops
router.get("/weekly-offs/staffing-preview", weeklyOffs.staffingPreview);

const crudRoutes: {
  path: string;
  table: string;
  prefix: string;
  orderBy?: string;
  mapIncoming?: (body: Record<string, unknown>, ctx?: { isCreate: boolean }) => Record<string, unknown>;
}[] = [
  {
    path: "/masters/departments",
    table: hrTables.departments,
    prefix: "HRD",
    orderBy: "dept_code",
    mapIncoming: (body: Record<string, unknown>, ctx?: { isCreate: boolean }) => {
      const name = String(
        body.departmentName ||
          body.department_name ||
          body.deptName ||
          body.dept_name ||
          body.name ||
          "",
      ).trim();
      if (name) {
        body.departmentName = name;
        body.department_name = name;
        body.deptName = name;
        body.name = name;
      }
      if (ctx?.isCreate && !body.deptCode && !body.dept_code) {
        const rand = Math.floor(100 + Math.random() * 900);
        body.deptCode = `DPT-${rand}`;
      }
      return body;
    },
  },
  {
    path: "/masters/designations",
    table: hrTables.designations,
    prefix: "HRDS",
    orderBy: "designation_code",
    mapIncoming: (body: Record<string, unknown>, ctx?: { isCreate: boolean }) => {
      const title = String(
        body.designationTitle ||
          body.designation_title ||
          body.designationName ||
          body.designation_name ||
          body.name ||
          body.title ||
          "",
      ).trim();
      if (title) {
        body.designationName = title;
        body.designation_name = title;
        body.designationTitle = title;
        body.designation_title = title;
        body.name = title;
      }
      if (ctx?.isCreate && !body.designationCode && !body.designation_code) {
        const rand = Math.floor(100 + Math.random() * 900);
        body.designationCode = `DSG-${rand}`;
      }
      return body;
    },
  },
  { path: "/masters/employment-types", table: hrTables.employmentTypes, prefix: "HRET", orderBy: "type_code" },
  { path: "/masters/shift-types", table: hrTables.shiftTypes, prefix: "HRST", orderBy: "shift_code" },
  { path: "/masters/leave-types", table: hrTables.leaveTypes, prefix: "HRLT", orderBy: "leave_code" },
  { path: "/masters/leave-policies", table: hrTables.leavePolicies, prefix: "HRLP", orderBy: "policy_code" },
  { path: "/masters/holidays", table: hrTables.holidays, prefix: "HRH", orderBy: "holiday_date" },
  { path: "/masters/salary-components", table: hrTables.salaryComponents, prefix: "HRSC", orderBy: "code" },
  { path: "/masters/document-categories", table: hrTables.documentCategories, prefix: "HRDC", orderBy: "name" },
  { path: "/masters/document-types", table: hrTables.documentTypes, prefix: "HRDT", orderBy: "name" },
  { path: "/attendance", table: hrTables.attendanceRecords, prefix: "HRA", orderBy: "record_date" },
  { path: "/shift-assignments", table: hrTables.shiftAssignments, prefix: "HRSA", orderBy: "effective_from" },
  { path: "/weekly-offs", table: hrTables.weeklyOffs, prefix: "HRWO", orderBy: "effective_from" },
  { path: "/leave-applications", table: hrTables.leaveApplications, prefix: "HRLA", orderBy: "applied_on" },
  { path: "/overtime", table: hrTables.overtimeRecords, prefix: "HROT", orderBy: "record_date" },
  {
    path: "/salary-structures",
    table: hrTables.salaryStructures,
    prefix: "HRSS",
    orderBy: "name",
    mapIncoming: (body: Record<string, unknown>) => {
      const next = { ...body };

      const normalizeIsoDate = (value: unknown): string | undefined => {
        if (value === null || value === undefined || value === "" || value === "—") {
          return undefined;
        }
        const raw = String(value).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
        const parts = raw.split("/");
        if (parts.length === 3) {
          const [day, month, year] = parts;
          if (year && month && day) {
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }
        }
        return undefined;
      };

      if ("effectiveFrom" in next) {
        const iso = normalizeIsoDate(next.effectiveFrom);
        if (iso) next.effectiveFrom = iso;
      }
      if ("effectiveTo" in next) {
        next.effectiveTo = normalizeIsoDate(next.effectiveTo);
      }
      if ("incentives" in next) {
        next.incentives = Boolean(next.incentives);
      }

      delete next.department;
      delete next.employmentType;
      delete next.createdDate;
      delete next.lastUpdated;
      delete next.assignedEmployees;

      return next;
    },
  },
  { path: "/salary-payments", table: hrTables.salaryPayments, prefix: "HRSP", orderBy: "payment_date" },
  { path: "/payslips", table: hrTables.payslips, prefix: "HRPS", orderBy: "generated_date" },
  { path: "/complaint-categories", table: hrTables.complaintCategories, prefix: "HRCC", orderBy: "category_name" },
  {
    path: "/complaints",
    table: hrTables.complaints,
    prefix: "HRC",
    orderBy: "submitted_date",
    mapIncoming: (body: Record<string, unknown>, ctx?: { isCreate: boolean }) => {
      const hasEmpId = "employeeId" in body || "employee_id" in body;
      if (hasEmpId) {
        const raw = body.employeeId !== undefined ? body.employeeId : body.employee_id;
        const empId = raw !== null && raw !== undefined ? String(raw).trim() : "";
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(empId);
        if (!isUuid || body.isAnonymous || body.is_anonymous) {
          body.employeeId = null;
          body.employee_id = null;
        }
      } else if (ctx?.isCreate) {
        body.employeeId = null;
        body.employee_id = null;
      }
      if (ctx?.isCreate) {
        if (!body.ticketNo && !body.ticket_no) {
          const rand = Math.floor(1000 + Math.random() * 9000);
          const year = new Date().getFullYear();
          body.ticketNo = `TCK-${year}-${rand}`;
        }
        if (!body.submittedDate && !body.submitted_date) {
          body.submittedDate = new Date().toISOString();
        }
        if (!body.status) {
          body.status = "Submitted";
        }
      }
      return body;
    },
  },
  { path: "/approval-workflows", table: hrTables.approvalWorkflows, prefix: "HRAW", orderBy: "code" },
];

for (const cfg of crudRoutes) {
  mountCrud(
    router,
    cfg.path,
    createTableCrud({
      table: cfg.table,
      idPrefix: cfg.prefix,
      orderBy: cfg.orderBy,
      mapIncoming: cfg.mapIncoming,
    }),
  );
}

// Payroll settings (singleton)
const settingsCrud = createTableCrud({
  table: hrTables.payrollSettings,
  idPrefix: "HRSET",
});
router.get("/payroll/settings", settingsCrud.list);
router.get("/payroll/settings/:id", settingsCrud.get);
router.post("/payroll/settings", settingsCrud.create);
router.put("/payroll/settings/:id", settingsCrud.update);
router.patch("/payroll/settings/:id", settingsCrud.update);

export default router;
