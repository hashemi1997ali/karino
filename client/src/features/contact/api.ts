import { apiRequest } from "@/lib/api-client";
import type { ContactSubmission, Pagination } from "@/lib/types";

export interface ContactConfig {
  email: string | null;
  socials: Array<{
    platform: "instagram" | "linkedin" | "x" | "facebook" | "telegram" | "github";
    url: string;
    configured: boolean;
  }>;
}

export interface ContactFormValues {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  locale: "en" | "de";
}

export const getContactConfigRequest = (): Promise<ContactConfig> =>
  apiRequest<ContactConfig>("/contact/config", { auth: false });

export const createContactRequest = (
  values: ContactFormValues,
): Promise<{ id: string }> =>
  apiRequest<{ id: string }>("/contact", {
    method: "POST",
    auth: false,
    json: values,
  });

export const listContactSubmissionsRequest = (
  page = 1,
): Promise<{ contacts: ContactSubmission[]; pagination: Pagination }> =>
  apiRequest<{ contacts: ContactSubmission[]; pagination: Pagination }>(
    `/contact/admin?page=${page}&limit=50`,
  );

export const replyToContactRequest = async (
  id: string,
  message: string,
): Promise<ContactSubmission> => {
  const data = await apiRequest<{ contact: ContactSubmission }>(
    `/contact/admin/${id}/replies`,
    { method: "POST", json: { message } },
  );
  return data.contact;
};

export const getContactReplySuggestionsRequest = async (
  id: string,
): Promise<string[]> => {
  const data = await apiRequest<{ suggestions: string[] }>(
    `/contact/admin/${id}/suggestions`,
  );
  return data.suggestions;
};

export const rewriteContactReplyRequest = async (
  id: string,
  message: string,
): Promise<string> => {
  const data = await apiRequest<{ message: string }>(
    `/contact/admin/${id}/rewrite`,
    { method: "POST", json: { message } },
  );
  return data.message;
};
