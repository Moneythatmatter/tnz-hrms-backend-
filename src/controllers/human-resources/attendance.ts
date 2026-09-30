import type { Request, Response } from "express";
import {
  deleteRow,
  getRowById,
  insertRow,
  listRows,
  newId,
  updateRow,
} from "../../models/base.js";
import { hrTables } from "../../models/human-resources/index.js";
import { fail, fromError, ok } from "../../utils/response.js";

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA");
}

export async function listAttendance(req: Request, res: Response) {
  try {
    const filters: Record<string, string | undefined> = {};
    if (req.query.employeeId) filters.employee_id = String(req.query.employeeId);
    if (req.query.date) filters.record_date = String(req.query.date);
    if (req.query.status && req.query.status !== "ALL") filters.status = String(req.query.status);

    const rows = await listRows(hrTables.attendanceRecords, {
      filters,
      orderBy: "record_date",
    }).catch(() => []);

    return ok(res, rows);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function getDailyAttendance(req: Request, res: Response) {
  try {
    const date = String(req.query.date || todayIso()).slice(0, 10);
    const rows = await listRows(hrTables.attendanceRecords, {
      filters: { record_date: date },
      orderBy: "created_at",
    }).catch(() => []);

    return ok(res, rows);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function getEmployeeAttendance(req: Request, res: Response) {
  try {
    const employeeId = String(req.params.id);
    const rows = await listRows(hrTables.attendanceRecords, {
      filters: { employee_id: employeeId },
      orderBy: "record_date",
    }).catch(() => []);

    return ok(res, rows);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function punchIn(req: Request, res: Response) {
  try {
    const body = req.body as Record<string, unknown>;
    const employeeId = String(body.employeeId || body.employee_id || "");
    if (!employeeId) return fail(res, "employeeId is required", 400);

    const date = String(body.attendanceDate || body.record_date || todayIso()).slice(0, 10);
    const timeStr = String(
      body.punchInAt ||
        body.checkIn ||
        new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    );

    // Check if record exists for this employee on this date
    const existing = await listRows(hrTables.attendanceRecords, {
      filters: { employee_id: employeeId, record_date: date },
    }).catch(() => []);

    if (existing.length > 0) {
      const record = existing[0] as Record<string, unknown>;
      const updated = await updateRow(
        hrTables.attendanceRecords,
        String(record.id),
        {
          check_in: timeStr,
          status: body.status || "Present",
          manual_reason: body.remarks || body.manualReason || record.manual_reason,
          is_manual_entry: true,
          updated_at: new Date().toISOString(),
        },
      );
      return ok(res, updated);
    }

    const newRecord = await insertRow(hrTables.attendanceRecords, {
      id: newId("HRA"),
      employee_id: employeeId,
      record_date: date,
      check_in: timeStr,
      check_out: "-",
      worked_hours: 0,
      expected_hours: 8,
      status: body.status || "Present",
      is_manual_entry: true,
      manual_reason: body.remarks || body.manualReason || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return ok(res, newRecord, 201);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function punchOut(req: Request, res: Response) {
  try {
    const body = req.body as Record<string, unknown>;
    const employeeId = String(body.employeeId || body.employee_id || "");
    if (!employeeId) return fail(res, "employeeId is required", 400);

    const date = String(body.attendanceDate || body.record_date || todayIso()).slice(0, 10);
    const timeStr = String(
      body.punchOutAt ||
        body.checkOut ||
        new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    );

    const existing = await listRows(hrTables.attendanceRecords, {
      filters: { employee_id: employeeId, record_date: date },
    }).catch(() => []);

    if (existing.length > 0) {
      const record = existing[0] as Record<string, unknown>;
      const updated = await updateRow(
        hrTables.attendanceRecords,
        String(record.id),
        {
          check_out: timeStr,
          worked_hours: Number(body.workedHours ?? 8),
          updated_at: new Date().toISOString(),
        },
      );
      return ok(res, updated);
    }

    const newRecord = await insertRow(hrTables.attendanceRecords, {
      id: newId("HRA"),
      employee_id: employeeId,
      record_date: date,
      check_in: "09:00 AM",
      check_out: timeStr,
      worked_hours: Number(body.workedHours ?? 8),
      expected_hours: 8,
      status: "Present",
      is_manual_entry: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return ok(res, newRecord, 201);
  } catch (e) {
    return fromError(res, e);
  }
}
