import { model, Schema, type Types } from "mongoose";

export const SUPPORT_CHAT_STATUSES = ["assistant", "open", "active", "ended"] as const;
export type SupportChatStatus = (typeof SUPPORT_CHAT_STATUSES)[number];

export const SUPPORT_CHAT_ORIGINS = ["user", "admin"] as const;
export type SupportChatOrigin = (typeof SUPPORT_CHAT_ORIGINS)[number];

export const SUPPORT_CHAT_LOCALES = ["en", "de"] as const;
export type SupportChatLocale = (typeof SUPPORT_CHAT_LOCALES)[number];

export const SUPPORT_MESSAGE_SENDERS = ["user", "ai", "staff", "system"] as const;
export type SupportMessageSender = (typeof SUPPORT_MESSAGE_SENDERS)[number];

export interface ISupportMessage {
  _id: Types.ObjectId;
  sender: SupportMessageSender;
  senderName: string | null;
  content: string;
  createdAt: Date;
}

export interface ISupportRating {
  score: number;
  reason: string;
}

export interface ISupportChat {
  user: Types.ObjectId;
  origin: SupportChatOrigin;
  locale: SupportChatLocale;
  subject: string;
  status: SupportChatStatus;
  assignedTo: Types.ObjectId | null;
  assignedToName: string | null;
  requiresSuperAdmin: boolean;
  lastAgent: string | null;
  messages: ISupportMessage[];
  rating: ISupportRating | null;
  endedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const supportMessageSchema = new Schema<ISupportMessage>(
  {
    sender: {
      type: String,
      enum: SUPPORT_MESSAGE_SENDERS,
      required: true,
    },
    senderName: {
      type: String,
      maxlength: 120,
      default: null,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: true, versionKey: false },
);

const supportChatSchema = new Schema<ISupportChat>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    origin: {
      type: String,
      enum: SUPPORT_CHAT_ORIGINS,
      required: true,
      default: "user",
    },
    locale: {
      type: String,
      enum: SUPPORT_CHAT_LOCALES,
      required: true,
      default: "en",
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    status: {
      type: String,
      enum: SUPPORT_CHAT_STATUSES,
      required: true,
      default: "assistant",
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedToName: {
      type: String,
      maxlength: 120,
      default: null,
    },
    requiresSuperAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    lastAgent: {
      type: String,
      maxlength: 80,
      default: null,
    },
    messages: {
      type: [supportMessageSchema],
      default: [],
    },
    rating: {
      type: new Schema<ISupportRating>(
        {
          score: { type: Number, required: true, min: 1, max: 5 },
          reason: { type: String, trim: true, maxlength: 1000, default: "" },
        },
        { _id: false },
      ),
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Ended chats are kept for a configurable retention period and then removed
// automatically by MongoDB's TTL monitor.
supportChatSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } },
);
supportChatSchema.index({ user: 1, updatedAt: -1 });
supportChatSchema.index({ status: 1, requiresSuperAdmin: 1, updatedAt: -1 });

export const SupportChat = model<ISupportChat>("SupportChat", supportChatSchema);
