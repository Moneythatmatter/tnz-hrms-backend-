import type { NextFunction, Response } from "express";
import { AppError, UnauthorizedError } from "../errors/index.js";
import {
  findEmployeeByEmail,
  type EmployeeRow,
} from "../services/employee-portal/employee-context.service.js";
import type { ContextRequest } from "./request-context.js";

export type EmployeeRequest = ContextRequest & {
  employee?: EmployeeRow;
  employeeId?: string;
};

/** Requires auth + linked hr_employees row (matched by user email). */
export function requireEmployee(
  req: EmployeeRequest,
  res: Response,
  next: NextFunction,
) {
  void (async () => {
    try {
      if (!req.auth?.email) {
        throw new UnauthorizedError("Authentication required");
      }

      const employee = await findEmployeeByEmail(req.auth.email);
      if (!employee) {
        throw new AppError(
          "This account is not linked to an employee profile.",
          403,
          "EMPLOYEE_NOT_LINKED",
        );
      }

      req.employee = employee;
      req.employeeId = String(employee.id);
      next();
    } catch (e) {
      next(e);
    }
  })();
}
