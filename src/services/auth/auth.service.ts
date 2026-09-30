import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../../config/index.js";
import { supabase } from "../../utils/supabase.js";
import { toCamel } from "../../utils/mappers.js";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../errors/index.js";
import {
  buildEmployeeContext,
  findEmployeeByEmail,
  getEmployeeById,
} from "../employee-portal/employee-context.service.js";
import type { AuthUserPublic, AuthUserRow } from "../../types/auth.js";

const USERS_TABLE = "users";

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  isSuperAdmin?: boolean;
};

async function resolveLinkedEmployee(user: AuthUserRow) {
  if (user.employeeId) {
    const byId = await getEmployeeById(String(user.employeeId)).catch(() => null);
    if (byId) return byId;
  }
  return findEmployeeByEmail(user.email).catch(() => null);
}

async function toPublic(user: AuthUserRow): Promise<AuthUserPublic> {
  const base: AuthUserPublic = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    initials: user.initials,
    isSuperAdmin: Boolean(user.isSuperAdmin),
    employeeId: user.employeeId ?? null,
    employee: null,
  };

  const employee = await resolveLinkedEmployee(user);
  if (!employee) return base;

  const employeeContext = await buildEmployeeContext(employee);

  return {
    ...base,
    employeeId: employeeContext.employeeId,
    employee: employeeContext,
  };
}

function signToken(user: Pick<AuthUserPublic, "id" | "email" | "role" | "isSuperAdmin">): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
  };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

async function findByEmail(email: string): Promise<AuthUserRow | null> {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) {
    const hint =
      /fetch failed/i.test(error.message)
        ? " Restart the backend after editing backend/.env, and verify SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY."
        : " Did you run sql/setup-hrms-database.sql?";
    throw new AppError(`Auth database error: ${error.message}.${hint}`, 500, "DATABASE_ERROR");
  }
  if (!data) return null;
  return toCamel<AuthUserRow>(data);
}

async function findById(id: string): Promise<AuthUserRow | null> {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new AppError(
      `Auth database error: ${error.message}`,
      500,
      "DATABASE_ERROR",
    );
  }
  if (!data) return null;
  return toCamel<AuthUserRow>(data);
}

export const AuthService = {
  async login(email: string, password: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) {
      throw new ValidationError("Email and password are required");
    }

    const user = await findByEmail(normalized);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (user.status && user.status !== "Active") {
      throw new UnauthorizedError("Account is inactive");
    }

    const okHash = await bcrypt.compare(password, user.passwordHash);
    if (!okHash) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const publicUser = await toPublic(user);
    const token = signToken(publicUser);
    return { user: publicUser, token };
  },

  /** Employee portal login — requires an explicit employee link on the user record. */
  async employeeLogin(email: string, password: string) {
    const result = await AuthService.login(email, password);
    const row = await findByEmail(email.trim().toLowerCase());
    if (!row?.employeeId || !result.user.employeeId) {
      throw new AppError(
        "This account is not linked to an employee profile.",
        403,
        "EMPLOYEE_NOT_LINKED",
      );
    }
    return result;
  },

  async me(token: string) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      const user = await findById(decoded.sub);
      if (!user) throw new NotFoundError("User not found");
      if (user.status && user.status !== "Active") {
        throw new UnauthorizedError("Account is inactive");
      }
      return await toPublic(user);
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new UnauthorizedError("Invalid or expired token");
    }
  },

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as JwtPayload;
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
  },
};
