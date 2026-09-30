/**
 * OpenAPI 3.0 specification for the HRMS API.
 * Served at GET /api-docs (Swagger UI) and GET /api-docs.json
 */

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

type Operation = {
  tags: string[];
  summary: string;
  description?: string;
  parameters?: unknown[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
  security?: unknown[];
};

type Paths = Record<string, Partial<Record<HttpMethod, Operation>>>;

const successSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    data: {},
  },
  required: ["success", "data"],
};

const errorSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", example: false },
    error: { type: "string" },
    code: { type: "string" },
    details: {},
  },
  required: ["success", "error"],
};

function okResponse(description = "Successful response", schema: unknown = successSchema) {
  return {
    description,
    content: { "application/json": { schema } },
  };
}

function errorResponses() {
  return {
    "400": {
      description: "Bad request / validation error",
      content: { "application/json": { schema: errorSchema } },
    },
    "401": {
      description: "Unauthorized",
      content: { "application/json": { schema: errorSchema } },
    },
    "404": {
      description: "Not found",
      content: { "application/json": { schema: errorSchema } },
    },
    "500": {
      description: "Server error",
      content: { "application/json": { schema: errorSchema } },
    },
  };
}

function jsonBody(description = "Request body", example?: unknown, schemaRef?: string) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: schemaRef
          ? { $ref: `#/components/schemas/${schemaRef}` }
          : {
              type: "object",
              additionalProperties: true,
              ...(example ? { example } : {}),
            },
      },
    },
    description,
  };
}

function idParam(name = "id", description = "Resource ID") {
  return {
    name,
    in: "path",
    required: true,
    schema: { type: "string" },
    description,
  };
}

function queryParam(name: string, description: string, example?: string) {
  return {
    name,
    in: "query",
    required: false,
    schema: { type: "string", ...(example ? { example } : {}) },
    description,
  };
}

function headerParam(name: string, description: string, required = false, example?: string) {
  return {
    name,
    in: "header",
    required,
    schema: { type: "string", ...(example ? { example } : {}) },
    description,
  };
}

const bearerSecurity = [{ bearerAuth: [] }] as Operation["security"];

function envelope(dataSchema: unknown) {
  return {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      data: dataSchema,
    },
    required: ["success", "data"],
  };
}

function envelopeRef(schemaName: string) {
  return envelope({ $ref: `#/components/schemas/${schemaName}` });
}

function envelopeArrayRef(schemaName: string) {
  return envelope({
    type: "array",
    items: { $ref: `#/components/schemas/${schemaName}` },
  });
}

const apiSchemas = {
  SuccessEnvelope: successSchema,
  ErrorEnvelope: errorSchema,

  HealthStatus: {
    type: "object",
    properties: {
      status: { type: "string", example: "ok" },
      service: { type: "string", example: "hrms-backend" },
    },
    required: ["status"],
  },

  ApiRootInfo: {
    type: "object",
    properties: {
      message: { type: "string", example: "HRMS API Server is running" },
      version: { type: "string", example: "1.0.0" },
      module: { type: "string", example: "Human Resource Management System (HRMS)" },
      docs: { type: "string", example: "/api-docs" },
      openapi: { type: "string", example: "/api-docs.json" },
    },
  },

  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email", example: "admin@gmail.com" },
      password: { type: "string", format: "password", example: "123456" },
    },
  },

  AuthUser: {
    type: "object",
    properties: {
      id: { type: "string", example: "U-ADMIN" },
      name: { type: "string", example: "Admin" },
      email: { type: "string", format: "email", example: "admin@gmail.com" },
      role: { type: "string", example: "Admin" },
      initials: { type: "string", example: "AD" },
      isSuperAdmin: { type: "boolean", example: true },
    },
    required: ["id", "name", "email", "role", "initials"],
  },

  LoginResponse: {
    type: "object",
    properties: {
      token: {
        type: "string",
        description: "JWT bearer token — use in Authorization header",
      },
      user: { $ref: "#/components/schemas/AuthUser" },
    },
    required: ["token", "user"],
  },




  PlatformModule: {
    type: "object",
    properties: {
      key: { type: "string", example: "hr_employees" },
      label: { type: "string", example: "Employee List" },
      group: { type: "string", example: "Employees" },
    },
    required: ["key", "label"],
  },

  PermissionLevel: {
    type: "string",
    enum: ["read", "write", "admin"],
    example: "write",
  },

  UserPermission: {
    type: "object",
    properties: {
      id: { type: "string" },
      userId: { type: "string" },
      moduleKey: { type: "string", example: "human_resources" },
      permission: { $ref: "#/components/schemas/PermissionLevel" },
    },
    required: ["id", "userId", "moduleKey", "permission"],
  },

  PermissionAssignment: {
    type: "object",
    required: ["moduleKey", "permission"],
    properties: {
      moduleKey: { type: "string", example: "human_resources" },
      permission: { $ref: "#/components/schemas/PermissionLevel" },
    },
  },

  MyPermissionsMap: {
    type: "object",
    additionalProperties: { $ref: "#/components/schemas/PermissionLevel" },
    example: {
      dashboard: "read",
      human_resources: "write",
    },
  },

  ManagedUser: {
    type: "object",
    allOf: [
      { $ref: "#/components/schemas/AuthUser" },
      {
        type: "object",
        properties: {
          status: { type: "string", example: "Active" },
          permissions: {
            type: "array",
            items: { $ref: "#/components/schemas/UserPermission" },
          },
        },
        required: ["status", "permissions"],
      },
    ],
  },

  CreateUserRequest: {
    type: "object",
    required: ["name", "email", "password"],
    properties: {
      name: { type: "string", example: "HR Manager" },
      email: { type: "string", format: "email", example: "hr@hotel.com" },
      password: { type: "string", format: "password", example: "123456" },
      role: { type: "string", example: "HR" },
      initials: { type: "string", example: "HM" },
      isSuperAdmin: { type: "boolean", default: false },
      permissions: {
        type: "array",
        items: { $ref: "#/components/schemas/PermissionAssignment" },
      },
    },
  },

  UpdateUserRequest: {
    type: "object",
    properties: {
      name: { type: "string" },
      role: { type: "string" },
      status: { type: "string", enum: ["Active", "Inactive"] },
      isSuperAdmin: { type: "boolean" },
      permissions: {
        type: "array",
        items: { $ref: "#/components/schemas/PermissionAssignment" },
      },
    },
  },
};

function crudPaths(
  basePath: string,
  tag: string,
  resource: string,
  opts?: {
    listQuery?: ReturnType<typeof queryParam>[];
    security?: Operation["security"];
  },
): Paths {
  const listParams = opts?.listQuery ?? [];
  const security = opts?.security ?? bearerSecurity;

  return {
    [basePath]: {
      get: {
        tags: [tag],
        summary: `List ${resource}`,
        security,
        parameters: [
          ...listParams,
        ],
        responses: { "200": okResponse(), ...errorResponses() },
      },
      post: {
        tags: [tag],
        summary: `Create ${resource.slice(0, -1)}`,
        security,
        requestBody: jsonBody(),
        responses: { "200": okResponse(), ...errorResponses() },
      },
    },
    [`${basePath}/{id}`]: {
      get: {
        tags: [tag],
        summary: `Get ${resource.slice(0, -1)}`,
        security,
        parameters: [
          idParam(),
        ],
        responses: { "200": okResponse(), ...errorResponses() },
      },
      put: {
        tags: [tag],
        summary: `Replace ${resource.slice(0, -1)}`,
        security,
        parameters: [
          idParam(),
        ],
        requestBody: jsonBody(),
        responses: { "200": okResponse(), ...errorResponses() },
      },
      patch: {
        tags: [tag],
        summary: `Update ${resource.slice(0, -1)}`,
        security,
        parameters: [
          idParam(),
        ],
        requestBody: jsonBody(),
        responses: { "200": okResponse(), ...errorResponses() },
      },
      delete: {
        tags: [tag],
        summary: `Delete ${resource.slice(0, -1)}`,
        security,
        parameters: [
          idParam(),
        ],
        responses: { "200": okResponse(), ...errorResponses() },
      },
    },
  };
}

function mergePaths(...parts: Paths[]): Paths {
  const out: Paths = {};
  for (const part of parts) {
    for (const [path, methods] of Object.entries(part)) {
      out[path] = { ...(out[path] ?? {}), ...methods };
    }
  }
  return out;
}

function actionPath(
  path: string,
  tag: string,
  summary: string,
  method: HttpMethod = "post",
  opts?: { body?: boolean; description?: string },
): Paths {
  return {
    [path]: {
      [method]: {
        tags: [tag],
        summary,
        description: opts?.description,
        security: bearerSecurity,
        parameters: [
          ...(path.includes("{id}") ? [idParam()] : []),
        ],
        ...(opts?.body ? { requestBody: jsonBody() } : {}),
        responses: { "200": okResponse(), ...errorResponses() },
      } as Operation,
    },
  };
}

const TAGS = [
  { name: "System", description: "Health and API metadata" },
  { name: "Auth", description: "Authentication and current user" },
  { name: "Platform · Users", description: "User and permission management" },
  { name: "Platform · Permissions", description: "Module permissions" },
  { name: "HR · Dashboard", description: "HR dashboard KPIs" },
  { name: "HR · Employees", description: "Employee records" },
  { name: "HR · Attendance", description: "Attendance and punch" },
  { name: "HR · Leave", description: "Leave applications" },
  { name: "HR · Payroll", description: "Payroll processing and payments" },
  { name: "HR · Masters", description: "HR master data" },
  { name: "HR · Operations", description: "Shifts, overtime, grievances, payslips" },
];

const systemPaths: Paths = {
  "/": {
    get: {
      tags: ["System"],
      summary: "API root",
      responses: { "200": okResponse("API is running", envelopeRef("ApiRootInfo")) },
    },
  },
  "/health": {
    get: {
      tags: ["System"],
      summary: "Health check",
      responses: { "200": okResponse("Service healthy", envelopeRef("HealthStatus")) },
    },
  },
};

const authPaths: Paths = {
  "/api/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Login",
      description: "Authenticate with email and password. Returns JWT and user profile.",
      requestBody: jsonBody("Credentials", undefined, "LoginRequest"),
      responses: {
        "200": okResponse("Login success — token + user", envelopeRef("LoginResponse")),
        ...errorResponses(),
      },
    },
  },
  "/api/auth/me": {
    get: {
      tags: ["Auth"],
      summary: "Current user",
      security: bearerSecurity,
      responses: {
        "200": okResponse("Current user", envelopeRef("AuthUser")),
        ...errorResponses(),
      },
    },
  },
};

const platformBase = "/api/platform";

const platformPaths: Paths = mergePaths(
  {
    [`${platformBase}/modules`]: {
      get: {
        tags: ["Platform · Permissions"],
        summary: "List platform modules",
        security: bearerSecurity,
        responses: {
          "200": okResponse("Module list", envelopeArrayRef("PlatformModule")),
          ...errorResponses(),
        },
      },
    },
    [`${platformBase}/permissions/me`]: {
      get: {
        tags: ["Platform · Permissions"],
        summary: "My permissions",
        security: bearerSecurity,
        responses: {
          "200": okResponse("Permission map", envelopeRef("MyPermissionsMap")),
          ...errorResponses(),
        },
      },
    },
    [`${platformBase}/users`]: {
      get: {
        tags: ["Platform · Users"],
        summary: "List users",
        security: bearerSecurity,
        responses: {
          "200": okResponse("User list", envelopeArrayRef("ManagedUser")),
          ...errorResponses(),
        },
      },
      post: {
        tags: ["Platform · Users"],
        summary: "Create user",
        security: bearerSecurity,
        requestBody: jsonBody("New user", undefined, "CreateUserRequest"),
        responses: {
          "201": okResponse("Created user", envelopeRef("ManagedUser")),
          ...errorResponses(),
        },
      },
    },
    [`${platformBase}/users/{id}`]: {
      put: {
        tags: ["Platform · Users"],
        summary: "Update user",
        security: bearerSecurity,
        parameters: [idParam("id", "User ID")],
        requestBody: jsonBody("User fields to update", undefined, "UpdateUserRequest"),
        responses: {
          "200": okResponse("Updated user", envelopeRef("ManagedUser")),
          ...errorResponses(),
        },
      },
    },
  },
);

const hrBase = "/api/human-resources";

const hrPaths: Paths = mergePaths(
  {
    [`${hrBase}/dashboard`]: {
      get: {
        tags: ["HR · Dashboard"],
        summary: "HR dashboard",
        security: bearerSecurity,
        responses: { "200": okResponse(), ...errorResponses() },
      },
    },
  },
  crudPaths(`${hrBase}/employees`, "HR · Employees", "employees"),
  actionPath(`${hrBase}/attendance/punch-in`, "HR · Attendance", "Punch in"),
  actionPath(`${hrBase}/attendance/punch-out`, "HR · Attendance", "Punch out"),
  {
    [`${hrBase}/attendance/daily`]: {
      get: {
        tags: ["HR · Attendance"],
        summary: "Daily attendance",
        security: bearerSecurity,
        parameters: [
          queryParam("date", "Attendance date (YYYY-MM-DD)"),
        ],
        responses: { "200": okResponse(), ...errorResponses() },
      },
    },
    [`${hrBase}/attendance/employee/{id}`]: {
      get: {
        tags: ["HR · Attendance"],
        summary: "Employee attendance history",
        security: bearerSecurity,
        parameters: [
          idParam("id", "Employee ID"),
        ],
        responses: { "200": okResponse(), ...errorResponses() },
      },
    },
  },
  crudPaths(`${hrBase}/leave-applications`, "HR · Leave", "leave applications"),
  actionPath(`${hrBase}/leave-applications/preview-days`, "HR · Leave", "Preview leave days"),
  actionPath(`${hrBase}/leave-applications/{id}/approve`, "HR · Leave", "Approve leave"),
  actionPath(`${hrBase}/leave-applications/{id}/reject`, "HR · Leave", "Reject leave", "post", { body: true }),
  actionPath(`${hrBase}/leave-applications/{id}/cancel`, "HR · Leave", "Cancel leave"),
  actionPath(`${hrBase}/leave-applications/{id}/modify`, "HR · Leave", "Modify leave", "post", { body: true }),
  {
    [`${hrBase}/payroll/records`]: {
      get: {
        tags: ["HR · Payroll"],
        summary: "List payroll records",
        security: bearerSecurity,
        parameters: [
          queryParam("month", "Payroll month"),
          queryParam("year", "Payroll year"),
        ],
        responses: { "200": okResponse(), ...errorResponses() },
      },
      post: {
        tags: ["HR · Payroll"],
        summary: "Create payroll record",
        security: bearerSecurity,
        requestBody: jsonBody(),
        responses: { "200": okResponse(), ...errorResponses() },
      },
    },
    [`${hrBase}/payroll/records/{id}`]: {
      get: {
        tags: ["HR · Payroll"],
        summary: "Get payroll record",
        security: bearerSecurity,
        parameters: [
          idParam(),
        ],
        responses: { "200": okResponse(), ...errorResponses() },
      },
      put: {
        tags: ["HR · Payroll"],
        summary: "Update payroll record",
        security: bearerSecurity,
        parameters: [
          idParam(),
        ],
        requestBody: jsonBody(),
        responses: { "200": okResponse(), ...errorResponses() },
      },
    },
    [`${hrBase}/payroll/audit-logs`]: {
      get: {
        tags: ["HR · Payroll"],
        summary: "Payroll audit logs",
        security: bearerSecurity,
        responses: { "200": okResponse(), ...errorResponses() },
      },
    },
  },
  actionPath(`${hrBase}/payroll/records/{id}/approve`, "HR · Payroll", "Approve payroll"),
  actionPath(`${hrBase}/payroll/records/{id}/payments`, "HR · Payroll", "Record salary payment", "post", { body: true }),
  crudPaths(`${hrBase}/payroll/settings`, "HR · Payroll", "payroll settings"),
  crudPaths(`${hrBase}/masters/departments`, "HR · Masters", "departments"),
  crudPaths(`${hrBase}/masters/designations`, "HR · Masters", "designations"),
  crudPaths(`${hrBase}/masters/employment-types`, "HR · Masters", "employment types"),
  crudPaths(`${hrBase}/masters/shift-types`, "HR · Masters", "shift types"),
  crudPaths(`${hrBase}/masters/leave-types`, "HR · Masters", "leave types"),
  crudPaths(`${hrBase}/masters/leave-policies`, "HR · Masters", "leave policies"),
  crudPaths(`${hrBase}/masters/holidays`, "HR · Masters", "holidays"),
  crudPaths(`${hrBase}/masters/salary-components`, "HR · Masters", "salary components"),
  crudPaths(`${hrBase}/masters/document-categories`, "HR · Masters", "document categories"),
  crudPaths(`${hrBase}/masters/document-types`, "HR · Masters", "document types"),
  crudPaths(`${hrBase}/attendance`, "HR · Attendance", "attendance records"),
  crudPaths(`${hrBase}/shift-assignments`, "HR · Operations", "shift assignments"),
  crudPaths(`${hrBase}/weekly-offs`, "HR · Operations", "weekly offs"),
  crudPaths(`${hrBase}/overtime`, "HR · Operations", "overtime records"),
  crudPaths(`${hrBase}/salary-structures`, "HR · Operations", "salary structures"),
  crudPaths(`${hrBase}/salary-payments`, "HR · Operations", "salary payments"),
  crudPaths(`${hrBase}/payslips`, "HR · Operations", "payslips"),
  crudPaths(`${hrBase}/complaint-categories`, "HR · Operations", "complaint categories"),
  crudPaths(`${hrBase}/complaints`, "HR · Operations", "complaints"),
  crudPaths(`${hrBase}/approval-workflows`, "HR · Operations", "approval workflows"),
  {
    [`${hrBase}/weekly-offs/staffing-preview`]: {
      get: {
        tags: ["HR · Operations"],
        summary: "Weekly off staffing preview",
        security: bearerSecurity,
        parameters: [
          queryParam("date", "Date to preview"),
          queryParam("from", "Range start"),
          queryParam("to", "Range end"),
        ],
        responses: { "200": okResponse(), ...errorResponses() },
      },
    },
  },
);

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "HRMS API",
    version: "1.0.0",
    description: [
      "REST API for **Human Resource Management System (HRMS)**.",
      "",
      "### Modules",
      "| Prefix | Module |",
      "|--------|--------|",
      "| `/api/auth` | Authentication |",
      "| `/api/platform` | Users & module permissions |",
      "| `/api/human-resources` | Human Resources (HR) |",
      "",
      "### Response envelope",
      "Success: `{ success: true, data: ... }`",
      "Error: `{ success: false, error: string, code?: string, details?: ... }`",
    ].join("\n"),
    contact: { name: "HRMS Backend" },
  },
  servers: [
    { url: "http://localhost:2", description: "Local development" },
    { url: "/", description: "Current host" },
  ],
  tags: TAGS,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT from `POST /api/auth/login`",
      },
    },
    schemas: apiSchemas,
  },
  paths: mergePaths(systemPaths, authPaths, platformPaths, hrPaths),
};
