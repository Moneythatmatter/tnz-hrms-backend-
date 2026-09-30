import type { Request, Response } from "express";
import { hrModel, hrTables } from "../../models/human-resources/index.js";
import { newId } from "../../models/base.js";
import {
  enrichPayrollRecord,
  enrichPayrollRecords,
  mapPayrollIncoming,
} from "../../services/human-resources/enrich.js";
import { calculatePayrollForPeriod } from "../../services/human-resources/payroll-calculate.service.js";
import { generatePayslipForPayroll } from "../../services/human-resources/payslip.service.js";
import { syncPayrollPaymentStatus } from "../../services/human-resources/payment-status.service.js";
import { fail, fromError, ok } from "../../utils/response.js";

const APPROVABLE = new Set(["Calculated", "Verified"]);
const NON_EDITABLE = new Set(["Approved", "Partially Paid", "Paid"]);

type PayrollRow = {
  id: string;
  status: string;
  isLocked?: boolean;
  employeeId: string;
  netSalary: number;
};

async function writeAudit(
  action: string,
  entityType: string,
  entityId: string,
  changedBy: string,
  notes?: string,
) {
  await hrModel.create(hrTables.auditLogs, {
    id: newId(),
    module: "payroll",
    action,
    entityType,
    entityId,
    changedBy,
    auditNotes: notes,
  });
}

async function approveOneRecord(id: string, changedBy: string) {
  const existing = await hrModel.get<PayrollRow>(hrTables.payrollRecords, id);
  if (!existing) throw new Error("Payroll record not found");
  if (existing.isLocked || NON_EDITABLE.has(existing.status)) {
    throw new Error("Payroll already approved, paid, or locked");
  }
  if (!APPROVABLE.has(existing.status)) {
    throw new Error(`Payroll must be Calculated or Verified before approval (current: ${existing.status})`);
  }

  const now = new Date().toISOString();
  const row = await hrModel.update(hrTables.payrollRecords, id, {
    status: "Approved",
    approvedAt: now,
    isLocked: true,
    updatedAt: now,
  });

  await generatePayslipForPayroll(id);
  await writeAudit(`Approved payroll record ${id}`, "payroll_record", id, changedBy);
  return row;
}

export async function listPayrollRecords(req: Request, res: Response) {
  try {
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const filters: Record<string, string | number> = {};
    if (month) filters.payroll_month = month;
    if (year) filters.payroll_year = year;
    const rows = await hrModel.list(hrTables.payrollRecords, {
      filters,
      orderBy: "created_at",
      ascending: false,
    });
    return ok(res, await enrichPayrollRecords(rows as Parameters<typeof enrichPayrollRecords>[0]));
  } catch (e) {
    return fromError(res, e);
  }
}

export async function getPayrollSummary(req: Request, res: Response) {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) return fail(res, "month and year are required", 400);

    const [records, payslips] = await Promise.all([
      hrModel.list<PayrollRow & { payslipGenerated?: boolean }>(hrTables.payrollRecords, {
        filters: { payroll_month: month, payroll_year: year },
      }),
      hrModel.list<{ status: string; payrollId?: string; payroll_id?: string }>(
        hrTables.payslips,
      ),
    ]);

    const payrollIds = new Set(records.map((r) => r.id));
    const periodPayslips = payslips.filter((p) =>
      payrollIds.has(String(p.payrollId ?? p.payroll_id)),
    );

    const summary = {
      totalEmployees: records.length,
      calculated: records.filter((r) => r.status === "Calculated").length,
      verified: records.filter((r) => r.status === "Verified").length,
      approved: records.filter((r) => r.status === "Approved").length,
      partiallyPaid: records.filter((r) => r.status === "Partially Paid").length,
      paid: records.filter((r) => r.status === "Paid").length,
      draft: records.filter((r) => r.status === "Draft").length,
      payslipsGenerated: periodPayslips.length,
      payslipsSent: periodPayslips.filter((p) => p.status === "Sent").length,
      netPayroll: records.reduce((s, r) => s + Number(r.netSalary ?? 0), 0),
    };
    return ok(res, summary);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function getPayrollRecord(req: Request, res: Response) {
  try {
    const row = await hrModel.get(hrTables.payrollRecords, String(req.params.id));
    if (!row) return fail(res, "Payroll record not found", 404);
    return ok(res, await enrichPayrollRecord(row as Parameters<typeof enrichPayrollRecord>[0]));
  } catch (e) {
    return fromError(res, e);
  }
}

export async function createPayrollRecord(req: Request, res: Response) {
  try {
    let body = mapPayrollIncoming({ ...(req.body as Record<string, unknown>) }, true);
    if (!body.id) body.id = newId();
    const row = await hrModel.create(hrTables.payrollRecords, body);
    return ok(res, await enrichPayrollRecord(row as Parameters<typeof enrichPayrollRecord>[0]), 201);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function updatePayrollRecord(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const existing = await hrModel.get<PayrollRow>(hrTables.payrollRecords, id);
    if (!existing) return fail(res, "Payroll record not found", 404);
    if (existing.isLocked || NON_EDITABLE.has(existing.status)) {
      return fail(res, "Payroll is locked — unlock before editing", 409);
    }

    let body = mapPayrollIncoming({ ...(req.body as Record<string, unknown>) }, false);
    delete body.id;
    const row = await hrModel.update(hrTables.payrollRecords, id, body);
    return ok(res, await enrichPayrollRecord(row as Parameters<typeof enrichPayrollRecord>[0]));
  } catch (e) {
    return fromError(res, e);
  }
}

export async function calculatePayroll(req: Request, res: Response) {
  try {
    const body = req.body as { month?: number; year?: number; employeeIds?: string[] };
    const month = Number(body.month);
    const year = Number(body.year);
    if (!month || month < 1 || month > 12 || !year) {
      return fail(res, "Valid month (1-12) and year are required", 400);
    }

    const result = await calculatePayrollForPeriod({
      month,
      year,
      employeeIds: body.employeeIds,
    });

    const rows = await hrModel.list(hrTables.payrollRecords, {
      filters: { payroll_month: month, payroll_year: year },
      orderBy: "created_at",
      ascending: false,
    });

    await writeAudit(
      `Calculated payroll for ${result.calculatedCount} employees (${result.monthLabel})`,
      "payroll_batch",
      result.batchId,
      String((body as { changedBy?: string }).changedBy ?? "HR Manager"),
      result.skippedCount > 0
        ? `${result.skippedCount} employee(s) skipped (draft or locked)`
        : undefined,
    );

    return ok(res, {
      ...result,
      records: await enrichPayrollRecords(rows as Parameters<typeof enrichPayrollRecords>[0]),
    });
  } catch (e) {
    return fromError(res, e);
  }
}

export async function verifyPayrollRecord(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const existing = await hrModel.get<PayrollRow>(hrTables.payrollRecords, id);
    if (!existing) return fail(res, "Payroll record not found", 404);
    if (existing.isLocked || NON_EDITABLE.has(existing.status)) {
      return fail(res, "Payroll is already approved or locked", 409);
    }
    if (existing.status !== "Calculated") {
      return fail(res, "Only Calculated payroll can be verified", 400);
    }

    const now = new Date().toISOString();
    const row = await hrModel.update(hrTables.payrollRecords, id, {
      status: "Verified",
      verifiedAt: now,
      updatedAt: now,
    });

    const changedBy = (req.body as { changedBy?: string })?.changedBy ?? "HR Manager";
    await writeAudit(`Verified payroll record ${id}`, "payroll_record", id, changedBy);
    return ok(res, await enrichPayrollRecord(row as Parameters<typeof enrichPayrollRecord>[0]));
  } catch (e) {
    return fromError(res, e);
  }
}

export async function verifyPayrollBatch(req: Request, res: Response) {
  try {
    const body = req.body as {
      month?: number;
      year?: number;
      recordIds?: string[];
      changedBy?: string;
    };
    const changedBy = body.changedBy ?? "HR Manager";
    let ids = body.recordIds ?? [];

    if (!ids.length && body.month && body.year) {
      const rows = await hrModel.list<PayrollRow>(hrTables.payrollRecords, {
        filters: { payroll_month: body.month, payroll_year: body.year },
      });
      ids = rows.filter((r) => r.status === "Calculated").map((r) => r.id);
    }

    const verified = [];
    const errors: { id: string; message: string }[] = [];
    for (const id of ids) {
      try {
        const existing = await hrModel.get<PayrollRow>(hrTables.payrollRecords, id);
        if (!existing || existing.status !== "Calculated") continue;
        const now = new Date().toISOString();
        await hrModel.update(hrTables.payrollRecords, id, {
          status: "Verified",
          verifiedAt: now,
          updatedAt: now,
        });
        await writeAudit(`Verified payroll record ${id}`, "payroll_record", id, changedBy);
        verified.push(id);
      } catch (err) {
        errors.push({ id, message: err instanceof Error ? err.message : "Failed" });
      }
    }

    return ok(res, { verifiedCount: verified.length, verified, errors });
  } catch (e) {
    return fromError(res, e);
  }
}

export async function approvePayrollRecord(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const changedBy = (req.body as { changedBy?: string })?.changedBy ?? "HR Manager";
    const row = await approveOneRecord(id, changedBy);
    return ok(res, await enrichPayrollRecord(row as Parameters<typeof enrichPayrollRecord>[0]));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Approval failed";
    if (message.includes("not found")) return fail(res, message, 404);
    if (message.includes("already")) return fail(res, message, 409);
    return fail(res, message, 400);
  }
}

export async function approvePayrollBatch(req: Request, res: Response) {
  try {
    const body = req.body as {
      month?: number;
      year?: number;
      recordIds?: string[];
      changedBy?: string;
    };
    const changedBy = body.changedBy ?? "HR Manager";
    let ids = body.recordIds ?? [];

    if (!ids.length && body.month && body.year) {
      const rows = await hrModel.list<PayrollRow>(hrTables.payrollRecords, {
        filters: { payroll_month: body.month, payroll_year: body.year },
      });
      ids = rows.filter((r) => APPROVABLE.has(r.status)).map((r) => r.id);
    }

    const approved: string[] = [];
    const errors: { id: string; message: string }[] = [];
    for (const id of ids) {
      try {
        await approveOneRecord(id, changedBy);
        approved.push(id);
      } catch (err) {
        errors.push({ id, message: err instanceof Error ? err.message : "Failed" });
      }
    }

    return ok(res, { approvedCount: approved.length, approved, errors });
  } catch (e) {
    return fromError(res, e);
  }
}

export async function unlockPayrollRecord(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const body = req.body as { reason?: string; changedBy?: string };
    const reason = body.reason?.trim();
    if (!reason) return fail(res, "Unlock reason is required", 400);

    const existing = await hrModel.get<PayrollRow>(hrTables.payrollRecords, id);
    if (!existing) return fail(res, "Payroll record not found", 404);
    if (!existing.isLocked && !NON_EDITABLE.has(existing.status)) {
      return fail(res, "Payroll is not locked", 400);
    }

    const payslips = await hrModel.list<{ id: string; status: string }>(hrTables.payslips, {
      filters: { payroll_id: id },
    });
    const sentPayslip = payslips.find((p) => p.status === "Sent");
    if (sentPayslip) {
      return fail(res, "Cannot unlock — payslip has already been sent to employee", 409);
    }

    for (const p of payslips) {
      await hrModel.remove(hrTables.payslips, p.id);
    }

    const now = new Date().toISOString();
    const row = await hrModel.update(hrTables.payrollRecords, id, {
      status: "Calculated",
      isLocked: false,
      approvedAt: null,
      verifiedAt: null,
      payslipGenerated: false,
      updatedAt: now,
    });

    const changedBy = body.changedBy ?? "HR Manager";
    await writeAudit(
      `Unlocked payroll record ${id}`,
      "payroll_record",
      id,
      changedBy,
      reason,
    );

    return ok(res, await enrichPayrollRecord(row as Parameters<typeof enrichPayrollRecord>[0]));
  } catch (e) {
    return fromError(res, e);
  }
}

export async function recordSalaryPayment(req: Request, res: Response) {
  try {
    const payrollId = String(req.params.id);
    const payroll = await hrModel.get<PayrollRow>(hrTables.payrollRecords, payrollId);
    if (!payroll) return fail(res, "Payroll record not found", 404);
    if (!["Approved", "Partially Paid"].includes(payroll.status)) {
      return fail(res, "Payroll must be approved before recording payment", 400);
    }

    const body = req.body as Record<string, unknown>;
    const now = new Date().toISOString();
    const payment = await hrModel.create(hrTables.salaryPayments, {
      id: newId(),
      payrollId,
      employeeId: payroll.employeeId,
      amount: body.amount ?? payroll.netSalary,
      paymentDate: body.paymentDate,
      paymentMode: body.paymentMode ?? "Bank Transfer",
      transactionReference: body.transactionReference,
      status: body.status ?? "Completed",
      remarks: body.remarks ?? "",
      recordedBy: body.recordedBy ?? "HR Manager",
      createdAt: now,
      updatedAt: now,
    });

    await syncPayrollPaymentStatus(payrollId);

    await writeAudit(
      `Recorded salary payment for payroll ${payrollId}`,
      "salary_payment",
      (payment as { id: string }).id,
      String(body.recordedBy ?? "HR Manager"),
      body.remarks ? String(body.remarks) : undefined,
    );

    const updatedPayroll = await hrModel.get(hrTables.payrollRecords, payrollId);
    return ok(res, { payment, payroll: await enrichPayrollRecord(updatedPayroll as Parameters<typeof enrichPayrollRecord>[0]) }, 201);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function listSalaryPayments(req: Request, res: Response) {
  try {
    const payrollId = String(req.params.id);
    const payroll = await hrModel.get(hrTables.payrollRecords, payrollId);
    if (!payroll) return fail(res, "Payroll record not found", 404);

    const rows = await hrModel.list(hrTables.salaryPayments, {
      filters: { payroll_id: payrollId },
      orderBy: "payment_date",
      ascending: false,
    });
    return ok(res, rows);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function listAuditLogs(_req: Request, res: Response) {
  try {
    const rows = await hrModel.list(hrTables.auditLogs, {
      orderBy: "created_at",
      ascending: false,
      limit: 100,
    });
    return ok(res, (rows as Record<string, unknown>[]).map((log) => ({
      id: log.id,
      action: log.action,
      changedBy: log.changedBy,
      changedOn: log.createdAt,
      auditNotes: log.auditNotes,
      overrideReason: log.overrideReason,
    })));
  } catch (e) {
    return fromError(res, e);
  }
}
