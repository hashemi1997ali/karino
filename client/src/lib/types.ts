export interface User {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
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
