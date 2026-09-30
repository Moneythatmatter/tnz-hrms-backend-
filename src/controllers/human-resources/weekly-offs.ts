import type { Request, Response } from "express";
import { hrModel } from "../../models/human-resources/index.js";
import { ok, fromError } from "../../utils/response.js";
export async function staffingPreview(req: Request, res: Response) {
  try {
    const day = String(req.query.day || "Sunday");
    const effectiveFrom = String(req.query.effectiveFrom || new Date().toISOString().slice(0, 10));
    const effectiveTo = req.query.effectiveTo ? String(req.query.effectiveTo) : "9999-12-31";
    const departmentFilter = req.query.department ? String(req.query.department) : "ALL";
    const excludeEmployeeId = req.query.excludeEmployeeId ? String(req.query.excludeEmployeeId) : "";

    const [weeklyOffRows, employeeRows] = await Promise.all([
      hrModel.list<Record<string, unknown>>(hrModel.tables.weeklyOffs, {
        orderBy: "effective_from",
      }).catch(() => []),
      hrModel.list<Record<string, unknown>>(hrModel.tables.employees, {
        orderBy: "first_name",
      }).catch(() => []),
    ]);

    const empMap = new Map<string, Record<string, unknown>>();
    for (const emp of employeeRows) {
      empMap.set(String(emp.id), emp);
    }

    const matching: Array<{
      employeeId: string;
      employeeName: string;
      department: string;
      designation: string;
      assignmentId: string;
      effectiveFrom: string;
      effectiveTo: string | null;
    }> = [];

    const departmentCounts: Record<string, number> = {};

    for (const wo of weeklyOffRows) {
      const empId = String(wo.employeeId || wo.employee_id || "");
      if (!empId || empId === excludeEmployeeId) continue;

      const days = Array.isArray(wo.days) ? (wo.days as string[]) : [];
      if (!days.includes(day)) continue;

      const woFrom = String(wo.effectiveFrom || wo.effective_from || "");
      const woTo = wo.effectiveTo || wo.effective_to ? String(wo.effectiveTo || wo.effective_to) : "9999-12-31";

      // Check date range overlap
      if (woFrom <= effectiveTo && woTo >= effectiveFrom) {
        const emp = empMap.get(empId);
        const empDept = String(emp?.department || emp?.dept_name || "General");
        const firstName = String(emp?.firstName || emp?.first_name || "");
        const lastName = String(emp?.lastName || emp?.last_name || "");
        const empName = [firstName, lastName].filter(Boolean).join(" ") || String(emp?.name || empId);
        const designation = String(emp?.designation || emp?.designation_name || "Staff");

        if (departmentFilter !== "ALL" && empDept !== departmentFilter) {
          continue;
        }

        departmentCounts[empDept] = (departmentCounts[empDept] || 0) + 1;

        matching.push({
          employeeId: empId,
          employeeName: empName,
          department: empDept,
          designation,
          assignmentId: String(wo.id),
          effectiveFrom: woFrom,
          effectiveTo: woTo === "9999-12-31" ? null : woTo,
        });
      }
    }

    return ok(res, {
      day,
      effectiveFrom,
      effectiveTo,
      total: matching.length,
      departmentCounts,
      employees: matching,
    });
  } catch (e) {
    return fromError(res, e);
  }
}
