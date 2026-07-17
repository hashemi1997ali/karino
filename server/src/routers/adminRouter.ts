import { Router } from "express";

import { authenticate, requireActiveSession, upload, validateByZod } from "#middlewares";
import {
  deleteAdminTask,
  deleteAdminTaskAttachment,
  deleteAdminUser,
  getAdminTaskById,
  getAdminTasks,
  getAdminUserById,
  getAdminUsers,
  updateAdminRole,
  updateAdminTask,
  updateAdminUser,
} from "../controllers/adminController.ts";
import { requireCurrentAdmin } from "../middlewares/requireCurrentAdmin.ts";
import {
  adminRoleSchema,
  adminUpdateTaskSchema,
  adminUpdateUserSchema,
} from "../schemas/adminSchema.ts";

export const adminRouter = Router();

adminRouter.use(authenticate, requireActiveSession, requireCurrentAdmin);

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
  validateByZod(adminRoleSchema),
  updateAdminRole,
);
adminRouter
  .route("/users/:id")
  .get(getAdminUserById)
  .patch(validateByZod(adminUpdateUserSchema), updateAdminUser)
  .delete(deleteAdminUser);
