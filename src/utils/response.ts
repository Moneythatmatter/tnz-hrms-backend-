import type { Response } from "express";
import { AppError, ValidationError } from "../errors/index.js";

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function fail(res: Response, error: string, status = 400) {
  return res.status(status).json({ success: false, error });
}

export function fromError(res: Response, error: unknown, status = 500) {
  if (error instanceof ValidationError) {
    return res.status(error.status).json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
    });
  }
  if (error instanceof AppError) {
    return res.status(error.status).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }
  const message =
    error instanceof Error ? error.message : "Internal server error";
  return fail(res, message, status);
}
