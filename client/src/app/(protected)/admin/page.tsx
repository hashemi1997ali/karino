import type { Metadata } from "next";

import { AdminOverviewView } from "@/features/admin/admin-overview-view";

export const metadata: Metadata = { title: "Admin overview" };

export default function AdminOverviewPage() {
  return <AdminOverviewView />;
}
