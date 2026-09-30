import type { NextFunction, Request, Response } from "express";
import { fromError } from "../utils/response.js";

/** Express error middleware — maps AppError / ValidationError to HTTP. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  return fromError(res, err);
}
