import { Router } from "express";

import { authenticate, requireActiveSession, upload, validateByZod } from "#middlewares";
import {
  banAdminUser,
  deleteAdminTask,
  deleteAdminTaskAttachment,
  deleteAdminUser,
  getAdminTaskById,
  getAdminTasks,
  getAdminUserById,
  getAdminUsers,
  unbanAdminUser,
  updateAdminRole,
  updateAdminTask,
  updateAdminUser,
} from "#controllers";
import { requireCurrentStaff, requireCurrentSuperAdmin } from "#middlewares";
import {
  adminBanSchema,
  adminRoleSchema,
  adminUpdateTaskSchema,
  adminUpdateUserSchema,
} from "#schemas";

export const adminRouter = Router();

adminRouter.use(authenticate, requireActiveSession, requireCurrentStaff);

adminRouter.get("/tasks", getAdminTasks);
adminRouter.delete("/tasks/:id/attachment", deleteAdminTaskAttachment);
adminRouter
  .route("/tasks/:id")
  .get(getAdminTaskById)
  .patch(
    upload.single("attachment"),
    validateByZod(adminUpdateTaskSchema),
    updateAdminTask,
  )
  .delete(deleteAdminTask);

adminRouter.get("/users", getAdminUsers);
adminRouter.patch(
  "/users/:id/admin-role",
  requireCurrentSuperAdmin,
  validateByZod(adminRoleSchema),
  updateAdminRole,
);
adminRouter.post("/users/:id/ban", validateByZod(adminBanSchema), banAdminUser);
adminRouter.post("/users/:id/unban", unbanAdminUser);
adminRouter
  .route("/users/:id")
  .get(getAdminUserById)
  .patch(validateByZod(adminUpdateUserSchema), updateAdminUser)
  .delete(deleteAdminUser);
