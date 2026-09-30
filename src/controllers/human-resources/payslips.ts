import type { Request, Response } from "express";
import { sendPayslip, sendPayslipsBatch } from "../../services/human-resources/payslip.service.js";
import { fail, fromError, ok } from "../../utils/response.js";

export async function sendOnePayslip(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const body = req.body as { sentBy?: string };
    const row = await sendPayslip(id, body.sentBy ?? "HR Manager");
    return ok(res, row);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send payslip";
    if (message.includes("not found")) return fail(res, message, 404);
    return fromError(res, e);
  }
}

export async function sendPayslipsBatchHandler(req: Request, res: Response) {
  try {
    const body = req.body as {
      month?: number;
      year?: number;
      payslipIds?: string[];
      sentBy?: string;
    };
    const result = await sendPayslipsBatch(body);
    return ok(res, result);
  } catch (e) {
    return fromError(res, e);
  }
}
