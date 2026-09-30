import type { Request, Response } from "express";
import {
  getRowById,
  insertRow,
  listRows,
  updateRow,
} from "../../models/base.js";
import { hrTables } from "../../models/human-resources/index.js";
import { fail, fromError, ok } from "../../utils/response.js";

function getDaysDiff(from: string, to: string): number {
  try {
    const d1 = new Date(from);
    const d2 = new Date(to);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  } catch {
    return 1;
  }
}

export async function approveLeaveApplication(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const body = req.body as Record<string, unknown>;
    const approvedBy = String(body.approvedBy || "HR Administrator");

    const existing = await getRowById(hrTables.leaveApplications, id);
    if (!existing) return fail(res, "Leave application not found", 404);

    const updated = await updateRow(hrTables.leaveApplications, id, {
      status: "Approved",
      approved_by: approvedBy,
      updated_at: new Date().toISOString(),
    });

    // Optionally deduct balance from employee record
    const empId = String((existing as Record<string, unknown>).employee_id || (existing as Record<string, unknown>).employeeId || "");
    const leaveTypeCode = String(
      (existing as Record<string, unknown>).leave_type_code ||
        (existing as Record<string, unknown>).leaveTypeCode ||
        "",
    ).toUpperCase();
    const days = Number((existing as Record<string, unknown>).total_days || (existing as Record<string, unknown>).totalDays || 1);

    if (empId) {
      const emp = await getRowById(hrTables.employees, empId).catch(() => null);
      if (emp) {
        const rawBal = (emp as Record<string, unknown>).leave_balance || (emp as Record<string, unknown>).leaveBalance;
        let bal: Record<string, number> = { casual: 10, sick: 12, earned: 15 };
        if (typeof rawBal === "object" && rawBal !== null) {
          bal = { ...bal, ...(rawBal as Record<string, number>) };
        } else if (typeof rawBal === "string") {
          try {
            bal = { ...bal, ...JSON.parse(rawBal) };
          } catch {}
        }

        if (leaveTypeCode.includes("SL") || leaveTypeCode.includes("SICK")) {
          bal.sick = Math.max(0, (bal.sick || 12) - days);
        } else if (leaveTypeCode.includes("EL") || leaveTypeCode.includes("EARN")) {
          bal.earned = Math.max(0, (bal.earned || 15) - days);
        } else {
          bal.casual = Math.max(0, (bal.casual || 10) - days);
        }

        await updateRow(hrTables.employees, empId, {
          leave_balance: bal,
          updated_at: new Date().toISOString(),
        }).catch(() => null);
      }
    }

    return ok(res, updated);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function rejectLeaveApplication(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const body = req.body as Record<string, unknown>;
    const approvedBy = String(body.approvedBy || "HR Administrator");

    const existing = await getRowById(hrTables.leaveApplications, id);
    if (!existing) return fail(res, "Leave application not found", 404);

    const updated = await updateRow(hrTables.leaveApplications, id, {
      status: "Rejected",
      approved_by: approvedBy,
      updated_at: new Date().toISOString(),
    });

    return ok(res, updated);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function cancelLeaveApplication(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    const existing = await getRowById(hrTables.leaveApplications, id);
    if (!existing) return fail(res, "Leave application not found", 404);

    const updated = await updateRow(hrTables.leaveApplications, id, {
      status: "Cancelled",
      updated_at: new Date().toISOString(),
    });

    return ok(res, updated);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function modifyLeaveApplication(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const body = req.body as Record<string, unknown>;
    const fromDate = String(body.fromDate || "");
    const toDate = String(body.toDate || "");

    const existing = await getRowById(hrTables.leaveApplications, id);
    if (!existing) return fail(res, "Leave application not found", 404);

    const totalDays = getDaysDiff(fromDate, toDate);

    const updated = await updateRow(hrTables.leaveApplications, id, {
      from_date: fromDate,
      to_date: toDate,
      total_days: totalDays,
      updated_at: new Date().toISOString(),
    });

    return ok(res, { ...(updated as Record<string, unknown>), newEffectiveDays: totalDays });
  } catch (e) {
    return fromError(res, e);
  }
}

export async function previewLeaveDays(req: Request, res: Response) {
  try {
    const body = req.body as Record<string, unknown>;
    const fromDate = String(body.fromDate || "");
    const toDate = String(body.toDate || "");
    const durationOption = String(body.durationOption || "Full Day");

    const calDays = getDaysDiff(fromDate, toDate);
    const effectiveDays = durationOption === "Full Day" ? calDays : 0.5;

    const dates: string[] = [];
    try {
      const d1 = new Date(fromDate);
      const d2 = new Date(toDate);
      const cur = new Date(d1);
      while (cur <= d2) {
        dates.push(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
      }
    } catch {}

    return ok(res, {
      effectiveDays,
      calendarDays: calDays,
      eligibleDates: dates,
      excluded: [],
    });
  } catch (e) {
    return fromError(res, e);
  }
}
