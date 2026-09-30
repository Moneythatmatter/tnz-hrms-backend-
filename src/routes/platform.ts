import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { platformUsersPermissionGuard } from "../middleware/permissions.js";
import { attachRequestContext } from "../middleware/request-context.js";
import * as platform from "../controllers/platform/index.js";

const router = Router();

router.use(requireAuth);
router.use(attachRequestContext);

router.get("/modules", platform.listModules);
router.get("/permissions/me", platform.myPermissions);

router.get("/users", platformUsersPermissionGuard, platform.listUsers);
router.post("/users", platformUsersPermissionGuard, platform.createUser);
router.put("/users/:id", platformUsersPermissionGuard, platform.updateUser);

export default router;
