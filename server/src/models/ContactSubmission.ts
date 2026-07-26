import { model, Schema, type Types } from "mongoose";

export const CONTACT_STATUSES = ["open", "answered"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CONTACT_MESSAGE_SENDERS = ["visitor", "staff"] as const;
export type ContactMessageSender = (typeof CONTACT_MESSAGE_SENDERS)[number];

export interface IContactMessage {
  sender: ContactMessageSender;
  senderName: string;
  senderId: Types.ObjectId | null;
  content: string;
  emailMessageId: string | null;
  createdAt: Date;
}

export interface IContactSubmission {
  firstName: string;
  lastName: string;
  email: string;
  locale: "en" | "de";
  status: ContactStatus;
  messages: IContactMessage[];
  lastRepliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    sender: { type: String, enum: CONTACT_MESSAGE_SENDERS, required: true },
    senderName: { type: String, required: true, trim: true, maxlength: 120 },
    senderId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    emailMessageId: { type: String, maxlength: 300, default: null },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: true, versionKey: false },
);

const contactSubmissionSchema = new Schema<IContactSubmission>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    locale: { type: String, enum: ["en", "de"], required: true, default: "en" },
    status: { type: String, enum: CONTACT_STATUSES, required: true, default: "open" },
    messages: { type: [contactMessageSchema], required: true, default: [] },
    lastRepliedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

contactSubmissionSchema.index({ status: 1, updatedAt: -1 });
contactSubmissionSchema.index({ email: 1, createdAt: -1 });

export const ContactSubmission = model<IContactSubmission>(
  "ContactSubmission",
  contactSubmissionSchema,
);
