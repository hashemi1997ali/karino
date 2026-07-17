import { apiRequest } from "@/lib/api-client";
import type { Pagination, User } from "@/lib/types";

export interface UserFilters {
  page: number;
  limit?: number;
  search?: string;
  role?: "user" | "admin" | "";
}

export const getUsersRequest = async (
  filters: UserFilters,
): Promise<{ users: User[]; pagination: Pagination }> => {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit ?? 10),
  });
  if (filters.search) query.set("search", filters.search);
  if (filters.role) query.set("role", filters.role);
  const data = await apiRequest<{
    users: User[];
    pagination?: Pagination;
    total?: number;
  }>(`/admin/users?${query.toString()}`);

  return {
    users: data.users,
    pagination: data.pagination ?? {
      total: data.total ?? data.users.length,
      page: filters.page,
      limit: filters.limit ?? 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: filters.page > 1,
    },
  };
};

export const updateUserRequest = async (
  id: string,
  values: { firstName: string; lastName: string; email: string },
): Promise<User> => {
  const data = await apiRequest<{ user: User }>(`/admin/users/${id}`, {
    method: "PATCH",
    json: values,
  });
  return data.user;
};

export const setAdminRoleRequest = async (
  id: string,
  isAdmin: boolean,
): Promise<User> => {
  const data = await apiRequest<{ user: User }>(`/admin/users/${id}/admin-role`, {
    method: "PATCH",
    json: { isAdmin },
  });
  return data.user;
};

export const deleteUserRequest = (id: string): Promise<void> =>
  apiRequest<void>(`/admin/users/${id}`, { method: "DELETE" });
