export class AppError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "APP_ERROR") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  details: { path: string; message: string }[];

  constructor(
    message = "Validation failed",
    details: { path: string; message: string }[] = [],
  ) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.details = details;
  }
}

export class PermissionError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "PERMISSION_ERROR");
    this.name = "PermissionError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Database error") {
    super(message, 500, "DATABASE_ERROR");
    this.name = "DatabaseError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}
