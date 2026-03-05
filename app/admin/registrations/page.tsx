import AdminRegistrationsClient from "@/components/admin-registrations-client";
import { requireAdminPageSession } from "@/lib/admin-auth";

export default async function AdminRegistrationsPage() {
  await requireAdminPageSession();
  return <AdminRegistrationsClient />;
}
