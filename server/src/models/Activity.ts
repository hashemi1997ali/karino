import { model, Schema, type Types } from "mongoose";

export const ACTIVITY_TYPES = [
  "task_created",
  "task_updated",
  "task_completed",
  "task_deleted",
  "sign_in",
  "password_changed",
  "session_revoked",
  "support_opened",
  "support_resolved",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface IActivity {
  user: Types.ObjectId;
  actor: Types.ObjectId;
  type: ActivityType;
  entityId: Types.ObjectId | null;
  label: string;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, default: null },
    label: { type: String, trim: true, maxlength: 160, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

activitySchema.index({ user: 1, createdAt: -1 });

export const Activity = model<IActivity>("Activity", activitySchema);
