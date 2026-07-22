export type UserRole = "user" | "admin" | "super_admin";
export type BanReason =
  | "spam"
  | "abusive-behavior"
  | "harassment"
  | "fraud"
  | "terms-violation"
  | "security"
  | "other";

export interface UserBan {
  isBanned: boolean;
  reason: BanReason;
  bannedAt: string;
  sessionIps: string[];
}

export interface User {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: UserRole[];
  ban?: UserBan | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskAttachment {
  url: string;
  originalName: string;
  resourceType: string;
}

export interface Task {
  id?: string;
  _id?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  attachment: TaskAttachment | null;
  owner: string | Pick<User, "id" | "firstName" | "lastName" | "email" | "roles">;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface TaskSummary {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  low: number;
  medium: number;
  high: number;
  overdue: number;
}

export interface RefreshSession {
  id: string;
  _id?: string;
  isCurrent: boolean;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  rotationCounter: number;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export type ChatStatus = "assistant" | "open" | "active" | "ended";
export type ChatSender = "user" | "ai" | "staff" | "system";

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  senderName: string | null;
  content: string;
  createdAt: string;
}

export interface SupportRating {
  score: number;
  reason: string;
}

export type SupportEscalationReason =
  | "account_banned"
  | "account_access"
  | "security"
  | "human_requested"
  | "permission"
  | "unresolved";

export interface SupportChat {
  id: string;
  user:
    | string
    | Pick<User, "id" | "firstName" | "lastName" | "email" | "roles" | "ban">
    | null;
  guest: { id: string | null; email: string | null; label: string } | null;
  origin: "user" | "admin" | "guest";
  locale: "en" | "de";
  subject: string;
  status: ChatStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  requiresSuperAdmin: boolean;
  escalationReason: SupportEscalationReason | null;
  lastAgent: string | null;
  messages: ChatMessage[];
  rating: SupportRating | null;
  assistantIdleExpiresAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  sender: "visitor" | "staff";
  senderName: string;
  content: string;
  emailMessageId: string | null;
  createdAt: string;
}

export interface ContactSubmission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  locale: "en" | "de";
  status: "open" | "answered";
  messages: ContactMessage[];
  lastRepliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
