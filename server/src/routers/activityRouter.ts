import { Router } from "express";

import { listOwnActivity } from "#controllers";
import { authenticate, requireActiveSession } from "#middlewares";

export const activityRouter = Router();

activityRouter.use(authenticate, requireActiveSession);
activityRouter.get("/", listOwnActivity);
