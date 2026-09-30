import type { Request, Response } from "express";
import { hrModel, hrTables } from "../../models/human-resources/index.js";
import { newId } from "../../models/base.js";
import { fail, fromError, ok } from "../../utils/response.js";
import * as compensation from "../../services/human-resources/compensation-revision.service.js";

export async function listAllCompensationRevisions(req: Request, res: Response) {
  try {
    const q = req.query as Record<string, string | undefined>;
    const rows = await compensation.listAllCompensationRevisions({
      status: q.status,
      revisionType: q.revisionType ?? q.revision_type,
      department: q.department,
      search: q.search ?? q.q,
      effectiveFrom: q.effectiveFrom ?? q.effective_from,
      effectiveTo: q.effectiveTo ?? q.effective_to,
    });
    return ok(res, rows);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function approveCompensationRevisionById(req: Request, res: Response) {
  try {
    const revisionId = String(req.params.revisionId);
    const body = req.body as Record<string, unknown>;
    const approvedBy = String(body.approvedBy ?? "HR Administrator");
    const row = await compensation.approveRevision(revisionId, approvedBy);
    return ok(res, row);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function getCompensationSummary(req: Request, res: Response) {
  try {
    const employeeId = String(req.params.employeeId);
    const summary = await compensation.getCompensationSummary(employeeId);
    return ok(res, summary);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function listCompensationRevisions(req: Request, res: Response) {
  try {
    const employeeId = String(req.params.employeeId);
    const rows = await compensation.listRevisionsForEmployee(employeeId);
    return ok(res, rows);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function previewCompensationIncrement(req: Request, res: Response) {
  try {
    const employeeId = String(req.params.employeeId);
    const body = req.body as Record<string, unknown>;
    const incrementType = String(body.incrementType ?? "percentage") as
      | "percentage"
      | "fixed"
      | "new_gross";
    const incrementValue = Number(body.incrementValue ?? body.increment ?? 0);
    const preview = await compensation.previewIncrement(employeeId, {
      incrementType,
      incrementValue,
      effectiveFrom: body.effectiveFrom ? String(body.effectiveFrom) : undefined,
    });
    return ok(res, preview);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function submitCompensationRevision(req: Request, res: Response) {
  try {
    const employeeId = String(req.params.employeeId);
    const body = req.body as Record<string, unknown>;
    const effectiveFrom = String(body.effectiveFrom ?? "").slice(0, 10);
    if (!effectiveFrom) return fail(res, "effectiveFrom is required", 400);

    const incrementType = String(body.incrementType ?? "percentage") as
      | "percentage"
      | "fixed"
      | "new_gross";
    const incrementValue = Number(body.incrementValue ?? body.increment ?? 0);

    const row = await compensation.submitRevision(employeeId, {
      revisionType: String(body.revisionType ?? "increment"),
      incrementType,
      incrementValue,
      effectiveFrom,
      reason: body.reason ? String(body.reason) : undefined,
      remarks: body.remarks ? String(body.remarks) : undefined,
      createdBy: body.createdBy ? String(body.createdBy) : undefined,
      autoApprove: Boolean(body.autoApprove),
    });
    return ok(res, row, 201);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function approveCompensationRevision(req: Request, res: Response) {
  try {
    const revisionId = String(req.params.revisionId);
    const body = req.body as Record<string, unknown>;
    const approvedBy = String(body.approvedBy ?? "HR Administrator");
    const row = await compensation.approveRevision(revisionId, approvedBy);
    return ok(res, row);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function createInitialCompensation(req: Request, res: Response) {
  try {
    const employeeId = String(req.params.employeeId);
    const body = req.body as Record<string, unknown>;
    const row = await compensation.ensureInitialRevision(
      employeeId,
      body.createdBy ? String(body.createdBy) : undefined,
    );
    return ok(res, row, 201);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function listBonusAwards(req: Request, res: Response) {
  try {
    const employeeId = String(req.params.employeeId);
    const rows = await hrModel.list(hrTables.bonusAwards, {
      filters: { employee_id: employeeId },
      orderBy: "created_at",
      ascending: false,
    });
    return ok(res, rows);
  } catch (e) {
    return fromError(res, e);
  }
}

export async function createBonusAward(req: Request, res: Response) {
  try {
    const employeeId = String(req.params.employeeId);
    const body = req.body as Record<string, unknown>;
    const month = Number(body.payrollMonth ?? body.payroll_month);
    const year = Number(body.payrollYear ?? body.payroll_year);
    const amount = Number(body.amount ?? 0);
    if (!month || !year || amount <= 0) {
      return fail(res, "payrollMonth, payrollYear, and positive amount are required", 400);
    }

    const now = new Date().toISOString();
    const autoApprove = body.autoApprove !== false;
    const row = await hrModel.create(hrTables.bonusAwards, {
      id: newId(),
      employeeId,
      payrollMonth: month,
      payrollYear: year,
      amount,
      reason: String(body.reason ?? ""),
      remarks: body.remarks ? String(body.remarks) : "",
      status: autoApprove ? "Approved" : "Pending",
      approvedBy: autoApprove ? String(body.createdBy ?? "HR") : null,
      approvedAt: autoApprove ? now : null,
      createdBy: String(body.createdBy ?? "HR"),
      createdAt: now,
      updatedAt: now,
    });
    return ok(res, row, 201);
  } catch (e) {
    return fromError(res, e);
  }
}
