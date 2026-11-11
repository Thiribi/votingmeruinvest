import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminUsersTable } from "@/components/AdminUsersTable";

export const Route = createFileRoute("/admin/users/staff")({
  component: StaffPage,
});

function StaffPage() {
  return (
    <AdminLayout title="Users & Roles — Users">
      <AdminUsersTable
        classification="staff"
        title="Users"
        addLabel="Add user"
        roleOptions={["moderator", "organizer", "admin"]}
        defaultRole="moderator"
      />
    </AdminLayout>
  );
}
