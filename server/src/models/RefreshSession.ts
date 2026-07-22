import { model, Schema, type Types } from "mongoose";

export const REFRESH_SESSION_REVOCATION_REASONS = [
  "logout",
  "logout-all",
  "logout-others",
  "reuse-detected",
  "user-deleted",
  "password-changed",
  "role-changed",
  "admin",
  "banned",
] as const;

export type RefreshSessionRevocationReason =
  (typeof REFRESH_SESSION_REVOCATION_REASONS)[number];

export interface IRefreshSession {
  user: Types.ObjectId;
  currentJtiHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  lastUsedAt: Date;
  rotationCounter: number;
  revokedAt: Date | null;
  revocationReason: RefreshSessionRevocationReason | null;
  createdAt: Date;
  updatedAt: Date;
}

const refreshSessionSchema = new Schema<IRefreshSession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    currentJtiHash: {
      type: String,
      required: true,
      select: false,
    },
    userAgent: {
      type: String,
      maxlength: 512,
      default: null,
    },
    ipAddress: {
      type: String,
      maxlength: 128,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      immutable: true,
    },
    lastUsedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    rotationCounter: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revocationReason: {
      type: String,
      enum: REFRESH_SESSION_REVOCATION_REASONS,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// MongoDB removes expired sessions eventually. Refresh queries still check
// expiresAt because TTL cleanup does not happen immediately.
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshSessionSchema.index({ user: 1, revokedAt: 1 });
refreshSessionSchema.index({ ipAddress: 1, user: 1 });

export const RefreshSession = model<IRefreshSession>(
  "RefreshSession",
  refreshSessionSchema,
);
