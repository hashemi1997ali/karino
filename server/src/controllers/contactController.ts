import type { RequestHandler } from "express";
import mongoose from "mongoose";

import { ContactSubmission, User, type IContactSubmission } from "#models";
import { contactListQuerySchema } from "#schemas";
import { sendContactReplyEmail } from "#services";
import { AppError } from "#utils";

const serializeContact = (contact: IContactSubmission & { _id: unknown }) => ({
  id: String(contact._id),
  firstName: contact.firstName,
  lastName: contact.lastName,
  email: contact.email,
  locale: contact.locale,
  status: contact.status,
  messages: contact.messages.map((message) => ({
    id: String((message as typeof message & { _id?: unknown })._id ?? ""),
    sender: message.sender,
    senderName: message.senderName,
    content: message.content,
    emailMessageId: message.emailMessageId,
    createdAt: message.createdAt,
  })),
  lastRepliedAt: contact.lastRepliedAt,
  createdAt: contact.createdAt,
  updatedAt: contact.updatedAt,
});

const socialConfig = [
  ["instagram", "CONTACT_INSTAGRAM_URL", "https://www.instagram.com"],
  ["linkedin", "CONTACT_LINKEDIN_URL", "https://www.linkedin.com"],
  ["x", "CONTACT_X_URL", "https://x.com"],
  ["facebook", "CONTACT_FACEBOOK_URL", "https://www.facebook.com"],
  ["telegram", "CONTACT_TELEGRAM_URL", "https://telegram.org"],
  ["github", "CONTACT_GITHUB_URL", "https://github.com"],
] as const;

const safeExternalUrl = (value: string | undefined, fallback: string): string => {
  if (!value?.trim()) return fallback;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : fallback;
  } catch {
    return fallback;
  }
};

export const getContactConfig: RequestHandler = async (_request, response) => {
  const email = process.env.CONTACT_EMAIL?.trim() || null;
  response.status(200).json({
    success: true,
    data: {
      email,
      socials: socialConfig.map(([platform, envName, fallback]) => ({
        platform,
        url: safeExternalUrl(process.env[envName], fallback),
        configured: Boolean(process.env[envName]?.trim()),
      })),
    },
  });
};

export const createContact: RequestHandler = async (request, response) => {
  const { firstName, lastName, email, message, locale } = request.body as {
    firstName: string;
    lastName: string;
    email: string;
    message: string;
    locale: "en" | "de";
  };
  const contact = await ContactSubmission.create({
    firstName,
    lastName,
    email,
    locale,
    status: "open",
    messages: [
      {
        sender: "visitor",
        senderName: `${firstName} ${lastName}`,
        content: message,
        emailMessageId: null,
        createdAt: new Date(),
      },
    ],
  });
  response.status(201).json({
    success: true,
    message: "Contact message received",
    data: { id: String(contact._id) },
  });
};

export const listContactSubmissions: RequestHandler = async (request, response) => {
  const query = contactListQuerySchema.parse(request.query);
  const filter = query.status ? { status: query.status } : {};
  const skip = (query.page - 1) * query.limit;
  const [contacts, total] = await Promise.all([
    ContactSubmission.find(filter)
      .sort({ status: -1, updatedAt: -1 })
      .skip(skip)
      .limit(query.limit),
    ContactSubmission.countDocuments(filter),
  ]);
  response.status(200).json({
    success: true,
    data: {
      contacts: contacts.map(serializeContact),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
        hasNextPage: query.page * query.limit < total,
        hasPreviousPage: query.page > 1,
      },
    },
  });
};

export const replyToContact: RequestHandler = async (request, response) => {
  const id = request.params.id;
  if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid contact message ID", 400);
  }
  const [contact, staff] = await Promise.all([
    ContactSubmission.findById(id),
    User.findById(request.user?.userId).select("firstName lastName"),
  ]);
  if (!contact) throw new AppError("Contact message not found", 404);
  if (!staff) throw new AppError("Administrator not found", 404);

  const message = (request.body as { message: string }).message;
  const staffName = `${staff.firstName} ${staff.lastName}`;
  const emailMessageId = await sendContactReplyEmail({
    email: contact.email,
    name: `${contact.firstName} ${contact.lastName}`,
    message,
    locale: contact.locale,
  });
  contact.messages.push({
    sender: "staff",
    senderName: staffName,
    content: message,
    emailMessageId,
    createdAt: new Date(),
  });
  contact.status = "answered";
  contact.lastRepliedAt = new Date();
  await contact.save();

  response.status(200).json({
    success: true,
    message: "Reply sent by email",
    data: { contact: serializeContact(contact) },
  });
};
