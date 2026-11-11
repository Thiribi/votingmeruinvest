import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminUsersTable } from "@/components/AdminUsersTable";

export const Route = createFileRoute("/admin/users/fans")({
  component: FansPage,
});

function FansPage() {
  return (
    <AdminLayout title="Users & Roles — Fans">
      <AdminUsersTable classification="fan" title="Fans" addLabel="Add fan" roleOptions={["fan"]} defaultRole="fan" />
    </AdminLayout>
  );
}
