import AdminSessionsClient from "@/components/admin-sessions-client";
import { requireAdminPageSession } from "@/lib/admin-auth";

export default async function AdminSessionsPage() {
  await requireAdminPageSession();
  return <AdminSessionsClient />;
}
