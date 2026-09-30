import type { Response } from "express";
import { getRowById, insertRow, listRows, newId, updateRow } from "../../models/base.js";
import { hrTables } from "../../models/human-resources/index.js";
import type { EmployeeRequest } from "../../middleware/employee.js";
import {
  buildEmployeeProfile,
  getTodayAttendance,
  listEmployeeAttendance,
  mapPortalAttendanceRow,
} from "../../services/employee-portal/employee-context.service.js";
import { enrichEmployee } from "../../services/human-resources/enrich.js";
import {
  buildPayslipDocument,
  renderPayslipHtml,
} from "../../services/employee-portal/payslip-document.service.js";
import { fail, fromError, ok } from "../../utils/response.js";

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA");
}

function monthBounds(ref = new Date()) {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const fromDate = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const toDate = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { fromDate, toDate };
}

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

function parseWeeklyOffDays(row: Record<string, unknown>): string[] {
  const raw = row.days ?? row.fixedDay ?? row.fixed_day;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return raw.split(/[,/&]+/).map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function mapShiftAssignment(row: Record<string, unknown>) {
  return {
    shiftName: row.shiftName ?? row.shift_name,
    startTime: row.startTime ?? row.start_time,
    endTime: row.endTime ?? row.end_time,
    effectiveFrom: row.effectiveFrom ?? row.effective_from,
    effectiveTo: row.effectiveTo ?? row.effective_to,
    status: row.status,
  };
}

function mapWeeklyOff(row: Record<string, unknown>) {
  const days = parseWeeklyOffDays(row);
  return {
    offType: row.offType ?? row.off_type,
    days,
    fixedDay: days.length === 1 ? days[0] : undefined,
    rotationPattern: row.rotationPattern ?? row.rotation_pattern,
    effectiveFrom: row.effectiveFrom ?? row.effective_from,
    effectiveTo: row.effectiveTo ?? row.effective_to,
    status: row.status,
  };
}

function mapHoliday(row: Record<string, unknown>) {
  const holidayDate = String(row.holidayDate ?? row.holiday_date ?? "").slice(0, 10);
  return {
    id: row.id,
    holidayCode: row.holidayCode ?? row.holiday_code,
    holidayName: row.holidayName ?? row.holiday_name,
    holidayDate,
    dayOfWeek: row.dayOfWeek ?? row.day_of_week,
    category: row.category,
    isMandatory: row.isMandatory ?? row.is_mandatory,
    extraPayMultiplier: row.extraPayMultiplier ?? row.extra_pay_multiplier,
    year: row.year ?? (holidayDate ? Number(holidayDate.slice(0, 4)) : undefined),
    description: row.description,
    status: row.status,
  };
}

function mapLeaveApplication(row: Record<string, unknown>) {
  return {
    id: row.id,
    leaveTypeName: row.leaveTypeName ?? row.leave_type_name,
    leaveTypeCode: row.leaveTypeCode ?? row.leave_type_code,
    fromDate: row.fromDate ?? row.from_date,
    toDate: row.toDate ?? row.to_date,
    totalDays: row.totalDays ?? row.total_days,
    status: String(row.status ?? "Pending").toUpperCase(),
  };
}

function mapOvertime(row: Record<string, unknown>) {
  return {
    recordDate: row.recordDate ?? row.record_date,
    otType: row.otType ?? row.ot_type,
    overtimeHours: row.overtimeHours ?? row.overtime_hours,
    payableAmount: row.payableAmount ?? row.payable_amount,
    status: String(row.status ?? "Pending").toUpperCase(),
  };
}

function mapPayslip(row: Record<string, unknown>) {
  return {
    id: row.id,
    payslipNo: row.payslipNo ?? row.payslip_no,
    monthLabel: row.monthLabel ?? row.month_label,
    netSalary: row.netSalary ?? row.net_salary,
    status: row.status,
    generatedDate: row.generatedDate ?? row.generated_date,
  };
}

export async function getDashboard(req: EmployeeRequest, res: Response) {
  try {
    const employee = req.employee!;
    const employeeId = req.employeeId!;
    const enriched = await enrichEmployee(employee);
    const today = todayIso();
    const { fromDate, toDate } = monthBounds();

    const [
      attendanceRows,
      todayAtt,
      leaveApps,
      payslips,
      overtimeRows,
      shiftRows,
      holidays,
      allEmployees,
    ] = await Promise.all([
      listRows<Record<string, unknown>>(hrTables.attendanceRecords, {
        filters: { employee_id: employeeId },
        orderBy: "record_date",
      }).catch(() => []),
      getTodayAttendance(employeeId),
      listRows<Record<string, unknown>>(hrTables.leaveApplications, {
        filters: { employee_id: employeeId },
      }).catch(() => []),
      listRows<Record<string, unknown>>(hrTables.payslips, {
        filters: { employee_id: employeeId },
        orderBy: "generated_date",
      }).catch(() => []),
      listRows<Record<string, unknown>>(hrTables.overtimeRecords, {
        filters: { employee_id: employeeId },
      }).catch(() => []),
      listRows<Record<string, unknown>>(hrTables.shiftAssignments, {
        filters: { employee_id: employeeId },
        orderBy: "effective_from",
      }).catch(() => []),
      listRows<Record<string, unknown>>(hrTables.holidays, {
        orderBy: "holiday_date",
      }).catch(() => []),
      listRows<Record<string, unknown>>(hrTables.employees, {
        orderBy: "first_name",
      }).catch(() => []),
    ]);

    const presentDays = attendanceRows.filter((r) => {
      const d = String(r.recordDate ?? r.record_date ?? "").slice(0, 10);
      if (d < fromDate || d > toDate) return false;
      const status = String(r.status ?? "").toLowerCase();
      return status.includes("present") || status.includes("late") || status.includes("half");
    }).length;

    const leaveBalance =
      typeof enriched.leaveBalance === "object" && enriched.leaveBalance
        ? enriched.leaveBalance
        : { casual: 0, sick: 0, earned: 0 };

    const pendingLeaveCount = leaveApps.filter(
      (l) => String(l.status ?? "").toLowerCase() === "pending",
    ).length;

    const sortedPayslips = [...payslips].sort((a, b) =>
      String(b.generatedDate ?? b.generated_date ?? "").localeCompare(
        String(a.generatedDate ?? a.generated_date ?? ""),
      ),
    );
    const latestPayslip = sortedPayslips[0]
      ? mapPayslip(sortedPayslips[0])
      : null;

    const overtimePending = overtimeRows.filter(
      (o) => String(o.status ?? "").toLowerCase() === "pending",
    ).length;
    const overtimeApproved = overtimeRows.filter(
      (o) => String(o.status ?? "").toLowerCase() === "approved",
    ).length;

    const activeShift =
      shiftRows.find((s) => String(s.status ?? "").toLowerCase() === "active") ?? shiftRows[0];

    const todayShift = activeShift
      ? {
          shiftName: activeShift.shiftName ?? activeShift.shift_name,
          startTime: activeShift.startTime ?? activeShift.start_time,
          endTime: activeShift.endTime ?? activeShift.end_time,
        }
      : null;

    const upcomingHolidays = holidays
      .map(mapHoliday)
      .filter((h) => h.holidayDate >= today)
      .slice(0, 5)
      .map((h) => {
        const daysUntil = Math.max(
          0,
          Math.round(
            (new Date(h.holidayDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
        return {
          id: String(h.id),
          title: h.holidayName,
          displayDate: h.holidayDate,
          dayOfWeek: h.dayOfWeek,
          category: h.category,
          daysUntil,
        };
      });

    const upcomingBirthdays = allEmployees
      .filter((e) => e.id !== employeeId && e.dob)
      .map((e) => {
        const dob = String(e.dob).slice(0, 10);
        const [, mm, dd] = dob.split("-");
        const year = new Date().getFullYear();
        let next = new Date(`${year}-${mm}-${dd}`);
        if (next < new Date(today)) next = new Date(`${year + 1}-${mm}-${dd}`);
        const daysUntil = Math.max(
          0,
          Math.round((next.getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)),
        );
        return {
          id: String(e.id),
          name: `${e.firstName ?? e.first_name ?? ""} ${e.lastName ?? e.last_name ?? ""}`.trim(),
          avatar: String(e.avatar ?? (e.firstName ?? e.first_name ?? "E")).slice(0, 2).toUpperCase(),
          department: String(e.department ?? ""),
          displayDate: next.toISOString().slice(0, 10),
          daysUntil,
        };
      })
      .filter((b) => b.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);

    return ok(res, {
      date: today,
      employee: {
        name: enriched.name,
        empCode: enriched.empCode ?? enriched.emp_code,
        department: enriched.department,
        designation: enriched.designation,
        shiftType: enriched.shiftType,
      },
      todayShift,
      todayAttendance: todayAtt
        ? {
            attendanceStatus: todayAtt.attendanceStatus,
            punchIn: todayAtt.punchIn,
            punchOut: todayAtt.punchOut,
            workedHours: todayAtt.workedHours,
          }
        : null,
      monthlySummary: { fromDate, toDate, presentDays },
      leaveBalance,
      pendingLeaveCount,
      latestPayslip,
      overtime: { pendingCount: overtimePending, approvedCount: overtimeApproved },
      upcomingBirthdays,
      upcomingHolidays,
    });
  } catch (e) {
    return fromError(res, e);
  }
}

export async function getProfile(req: EmployeeRequest, res: Response) {
  try {
    const profile = await buildEmployeeProfile(req.employee!);
    return ok(res, profile);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function listAttendance(req: EmployeeRequest, res: Response) {
  try {
    const rows = await listEmployeeAttendance(req.employeeId!);
    return ok(res, rows);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function getAttendanceToday(req: EmployeeRequest, res: Response) {
  try {
    const row = await getTodayAttendance(req.employeeId!);
    return ok(res, row);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function punchIn(req: EmployeeRequest, res: Response) {
  try {
    const employeeId = req.employeeId!;
    const date = todayIso();
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const isoPunch = now.toISOString();

    const existing = await listRows<Record<string, unknown>>(hrTables.attendanceRecords, {
      filters: { employee_id: employeeId, record_date: date },
    }).catch(() => []);

    if (existing.length > 0) {
      const record = existing[0];
      if (record.checkIn && record.checkIn !== "-") {
        return fail(res, "Already punched in for today", 400);
      }
      await updateRow(hrTables.attendanceRecords, String(record.id), {
        check_in: timeStr,
        status: "Present",
        updated_at: now.toISOString(),
      });
    } else {
      const emp = req.employee!;
      await insertRow(hrTables.attendanceRecords, {
        id: newId("HRA"),
        employee_id: employeeId,
        record_date: date,
        check_in: timeStr,
        check_out: "-",
        worked_hours: 0,
        expected_hours: 8,
        status: "Present",
        shift_name: emp.shiftType ?? emp.shift_type,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    }

    return ok(res, {
      attendanceStatus: "PRESENT",
      punchIn: isoPunch,
      punchOut: undefined,
      workedHours: 0,
    });
  } catch (e) {
    return fromError(res, e);
  }
}

export async function punchOut(req: EmployeeRequest, res: Response) {
  try {
    const employeeId = req.employeeId!;
    const date = todayIso();
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const isoPunch = now.toISOString();

    const existing = await listRows<Record<string, unknown>>(hrTables.attendanceRecords, {
      filters: { employee_id: employeeId, record_date: date },
    }).catch(() => []);

    if (!existing.length) {
      return fail(res, "Punch in first before punching out", 400);
    }

    const record = existing[0];
    if (record.checkOut && record.checkOut !== "-") {
      return fail(res, "Already punched out for today", 400);
    }

    const punchInIso = mapPortalAttendanceRow(record).punchIn;
    let workedHours = 8;
    if (punchInIso) {
      const diffMs = now.getTime() - new Date(punchInIso).getTime();
      workedHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
    }

    await updateRow(hrTables.attendanceRecords, String(record.id), {
      check_out: timeStr,
      worked_hours: workedHours,
      updated_at: now.toISOString(),
    });

    return ok(res, {
      attendanceStatus: "PRESENT",
      punchIn: punchInIso,
      punchOut: isoPunch,
      workedHours,
    });
  } catch (e) {
    return fromError(res, e);
  }
}

export async function getSchedule(req: EmployeeRequest, res: Response) {
  try {
    const employeeId = req.employeeId!;
    const [shifts, weeklyOffs] = await Promise.all([
      listRows<Record<string, unknown>>(hrTables.shiftAssignments, {
        filters: { employee_id: employeeId },
        orderBy: "effective_from",
      }).catch(() => []),
      listRows<Record<string, unknown>>(hrTables.weeklyOffs, {
        filters: { employee_id: employeeId },
        orderBy: "effective_from",
      }).catch(() => []),
    ]);

    return ok(res, {
      shifts: shifts.map(mapShiftAssignment),
      weeklyOffs: weeklyOffs.map(mapWeeklyOff),
    });
  } catch (e) {
    return fromError(res, e);
  }
}

export async function listHolidays(req: EmployeeRequest, res: Response) {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const rows = await listRows<Record<string, unknown>>(hrTables.holidays, {
      orderBy: "holiday_date",
    }).catch(() => []);

    const filtered = rows
      .map(mapHoliday)
      .filter((h) => !h.year || Number(h.year) === year || h.holidayDate.startsWith(String(year)));

    return ok(res, filtered);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function getLeaveBalance(req: EmployeeRequest, res: Response) {
  try {
    const enriched = await enrichEmployee(req.employee!);
    const raw = enriched.leaveBalance ?? req.employee!.leaveBalance;
    if (typeof raw === "object" && raw) return ok(res, raw);
    if (typeof raw === "string") {
      try {
        return ok(res, JSON.parse(raw));
      } catch {
        return ok(res, { casual: 0, sick: 0, earned: 0 });
      }
    }
    return ok(res, { casual: 0, sick: 0, earned: 0 });
  } catch (e) {
    return fromError(res, e);
  }
}

export async function listLeaveApplications(req: EmployeeRequest, res: Response) {
  try {
    const rows = await listRows<Record<string, unknown>>(hrTables.leaveApplications, {
      filters: { employee_id: req.employeeId! },
      orderBy: "applied_on",
    }).catch(() => []);
    return ok(res, rows.map(mapLeaveApplication));
  } catch (e) {
    return fromError(res, e);
  }
}

export async function listLeaveTypes(_req: EmployeeRequest, res: Response) {
  try {
    const rows = await listRows<Record<string, unknown>>(hrTables.leaveTypes, {
      orderBy: "leave_code",
    }).catch(() => []);
    return ok(
      res,
      rows.map((r) => ({
        id: r.id,
        leaveCode: r.leaveCode ?? r.leave_code,
        leaveName: r.leaveName ?? r.leave_name,
        payType: r.payType ?? r.pay_type,
      })),
    );
  } catch (e) {
    return fromError(res, e);
  }
}

export async function previewLeaveDays(req: EmployeeRequest, res: Response) {
  try {
    const body = req.body as Record<string, unknown>;
    const fromDate = String(body.fromDate || "");
    const toDate = String(body.toDate || fromDate);
    const durationOption = String(body.durationOption || "Full Day");

    const calDays = getDaysDiff(fromDate, toDate);
    const [weeklyOffs, holidays] = await Promise.all([
      listRows<Record<string, unknown>>(hrTables.weeklyOffs, {
        filters: { employee_id: req.employeeId! },
      }).catch(() => []),
      listRows<Record<string, unknown>>(hrTables.holidays, { orderBy: "holiday_date" }).catch(
        () => [],
      ),
    ]);

    const offDays = new Set<string>();
    for (const wo of weeklyOffs) {
      for (const day of parseWeeklyOffDays(wo)) {
        offDays.add(day.toLowerCase());
      }
    }
    const holidayDates = new Set(
      holidays.map((h) => String(h.holidayDate ?? h.holiday_date ?? "").slice(0, 10)),
    );

    const excluded: Array<{ date: string; reason: string }> = [];
    const eligibleDates: string[] = [];
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    try {
      const d1 = new Date(fromDate);
      const d2 = new Date(toDate);
      const cur = new Date(d1);
      while (cur <= d2) {
        const iso = cur.toISOString().slice(0, 10);
        const dayName = dayNames[cur.getDay()];
        if (offDays.has(dayName)) {
          excluded.push({ date: iso, reason: "Weekly off" });
        } else if (holidayDates.has(iso)) {
          excluded.push({ date: iso, reason: "Holiday" });
        } else {
          eligibleDates.push(iso);
        }
        cur.setDate(cur.getDate() + 1);
      }
    } catch {
      /* ignore */
    }

    const effectiveDays =
      durationOption === "Half Day" ? 0.5 : Math.max(1, eligibleDates.length || calDays);

    return ok(res, {
      effectiveDays,
      calendarDays: calDays,
      eligibleDates,
      excluded,
    });
  } catch (e) {
    return fromError(res, e);
  }
}

export async function createLeaveApplication(req: EmployeeRequest, res: Response) {
  try {
    const body = req.body as Record<string, unknown>;
    const fromDate = String(body.fromDate || "");
    const toDate = String(body.toDate || fromDate);
    if (!fromDate) return fail(res, "fromDate is required", 400);

    const created = await insertRow(hrTables.leaveApplications, {
      id: newId("HRLA"),
      employee_id: req.employeeId,
      leave_type_id: body.leaveTypeId ?? body.leave_type_id,
      leave_type_code: body.leaveTypeCode ?? body.leave_type_code,
      leave_type_name: body.leaveTypeName ?? body.leave_type_name,
      is_paid: body.isPaid ?? body.is_paid ?? true,
      duration_option: body.durationOption ?? body.duration_option ?? "Full Day",
      priority: body.priority ?? "Normal",
      from_date: fromDate,
      to_date: toDate,
      total_days: Number(body.totalDays ?? body.total_days ?? getDaysDiff(fromDate, toDate)),
      reason: body.reason ?? "",
      status: "Pending",
      applied_on: body.appliedOn ?? new Date().toISOString(),
      approval_chain: body.approvalChain ?? body.approval_chain ?? [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return ok(res, mapLeaveApplication(created as Record<string, unknown>), 201);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function listOvertime(req: EmployeeRequest, res: Response) {
  try {
    const rows = await listRows<Record<string, unknown>>(hrTables.overtimeRecords, {
      filters: { employee_id: req.employeeId! },
      orderBy: "record_date",
    }).catch(() => []);
    return ok(res, rows.map(mapOvertime));
  } catch (e) {
    return fromError(res, e);
  }
}

export async function listPayslips(req: EmployeeRequest, res: Response) {
  try {
    const rows = await listRows<Record<string, unknown>>(hrTables.payslips, {
      filters: { employee_id: req.employeeId! },
      orderBy: "generated_date",
    }).catch(() => []);

    const mapped = rows.map(mapPayslip).sort((a, b) =>
      String(b.generatedDate ?? "").localeCompare(String(a.generatedDate ?? "")),
    );
    return ok(res, mapped);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function downloadPayslip(req: EmployeeRequest, res: Response) {
  try {
    const payslipId = String(req.params.id ?? "");
    if (!payslipId) return fail(res, "Payslip id is required", 400);

    const payslip = await getRowById<Record<string, unknown>>(hrTables.payslips, payslipId);
    if (!payslip) return fail(res, "Payslip not found", 404);

    const ownerId = String(payslip.employeeId ?? payslip.employee_id ?? "");
    if (ownerId !== req.employeeId) {
      return fail(res, "You do not have access to this payslip", 403);
    }

    const payrollId = payslip.payrollId ?? payslip.payroll_id;
    const payroll = payrollId
      ? await getRowById<Record<string, unknown>>(
          hrTables.payrollRecords,
          String(payrollId),
        ).catch(() => null)
      : null;

    const profile = await buildEmployeeProfile(req.employee!);
    const document = buildPayslipDocument(payslip, profile, payroll);
    const html = renderPayslipHtml(document);
    const filename = `${document.payslipNo.replace(/[^\w.-]+/g, "_")}.html`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(html);
  } catch (e) {
    return fromError(res, e);
  }
}
