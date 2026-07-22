import { Router } from "express";

import {
  authenticate,
  requireActiveSession,
  requireCurrentStaff,
  requireCurrentSuperAdmin,
  upload,
  validateByZod,
} from "#middlewares";
import {
  banAdminUser,
  deleteAdminTask,
  deleteAdminTaskAttachment,
  deleteAdminUser,
  getAdminUserById,
  getAdminUsers,
  getAdminUserTasks,
  unbanAdminUser,
  updateAdminRole,
  updateAdminTask,
  updateAdminUser,
} from "#controllers";
import {
  adminBanSchema,
  adminRoleSchema,
  adminUpdateTaskSchema,
  adminUpdateUserSchema,
} from "#schemas";

export const adminRouter = Router();

adminRouter.use(authenticate, requireActiveSession, requireCurrentStaff);

// Tasks are only exposed in the context of a selected user. There is no
// administrator-wide "all tasks" endpoint.
adminRouter.get("/users/:id/tasks", getAdminUserTasks);
adminRouter.delete(
  "/users/:userId/tasks/:taskId/attachment",
  requireCurrentSuperAdmin,
  deleteAdminTaskAttachment,
);
adminRouter
  .route("/users/:userId/tasks/:taskId")
  .patch(
    requireCurrentSuperAdmin,
    upload.single("attachment"),
    validateByZod(adminUpdateTaskSchema),
    updateAdminTask,
  )
  .delete(requireCurrentSuperAdmin, deleteAdminTask);

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
