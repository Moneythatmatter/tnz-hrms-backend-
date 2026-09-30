export type EmployeeContext = {
  employeeId: string;
  empCode: string;
  firstName: string;
  lastName: string;
  department?: string;
  designation?: string;
  leaveBalance?: { casual?: number; sick?: number; earned?: number };
};

export type AuthUserPublic = {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  isSuperAdmin?: boolean;
  employeeId?: string | null;
  employee?: EmployeeContext | null;
};

export type AuthUserRow = AuthUserPublic & {
  passwordHash: string;
  status?: string;
  /** FK to hr_employees — set when user is linked for employee portal access */
  employeeId?: string | null;
};
