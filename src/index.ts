import "dotenv/config";
import cors from "cors";
import express from "express";
import { config } from "./config/index.js";
import { mountApiDocs } from "./docs/index.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import authRoutes from "./routes/auth.js";
import humanResourcesRoutes from "./routes/human-resources.js";
import platformRoutes from "./routes/platform.js";
import employeePortalRoutes from "./routes/employee-portal.js";
import { getSupabaseHost, verifySupabaseConnection } from "./utils/supabase.js";

const app = express();
const PORT = config.port;

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.json({
    message: "HRMS API Server is running",
    version: "1.0.0",
    module: "Human Resource Management System (HRMS)",
    docs: "/api-docs",
    openapi: "/api-docs.json",
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "hrms-backend" });
});

mountApiDocs(app);

app.use("/api/auth", authRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/human-resources", humanResourcesRoutes);
app.use("/api/employee-portal", employeePortalRoutes);

app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n=================================================`);
  console.log(`  HRMS Backend Server running on http://localhost:${PORT}`);
  console.log(`  Supabase     → ${getSupabaseHost()}`);
  console.log(`  API docs     → http://localhost:${PORT}/api-docs`);
  console.log(`  OpenAPI JSON → http://localhost:${PORT}/api-docs.json`);
  console.log(`=================================================`);
  console.log(`Active HRMS Endpoints:`);
  console.log(`  [AUTH]     /api/auth`);
  console.log(`  [PLATFORM] /api/platform`);
  console.log(`  [HR]       /api/human-resources`);
  console.log(`  [PORTAL]   /api/employee-portal\n`);

  void verifySupabaseConnection()
    .then(() => console.log("[supabase] Database connection OK (users table reachable)\n"))
    .catch((err: Error) => {
      console.error(`[supabase] ${err.message}\n`);
    });
});

