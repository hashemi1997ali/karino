import { Router } from "express";

import {
  createTask,
  deleteTask,
  getTaskById,
  getTaskSummary,
  getTasks,
  updateTask,
} from "#controllers";
import { authenticate, requireActiveSession, validateByZod } from "#middlewares";
import { createTaskSchema, updateTaskSchema } from "#schemas";

export const taskRouter = Router();

taskRouter.use(authenticate, requireActiveSession);

taskRouter.get("/summary", getTaskSummary);

taskRouter
  .route("/")
  .get(getTasks)
  .post(validateByZod(createTaskSchema), createTask);

taskRouter
  .route("/:id")
  .get(getTaskById)
  .patch(validateByZod(updateTaskSchema), updateTask)
  .delete(deleteTask);
