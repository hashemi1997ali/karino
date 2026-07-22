import type { Metadata } from "next";

import { AdminContactView } from "@/features/contact/admin-contact-view";

export const metadata: Metadata = { title: "Contact form" };

export default function AdminContactPage() {
  return <AdminContactView />;
}
