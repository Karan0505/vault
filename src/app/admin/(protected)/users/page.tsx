import { getUsersDirectory } from "@/lib/auth/users.server";
import { UsersClient } from "@/components/admin/users/UsersClient";

export default async function AdminUsersPage() {
  const { staff, customers } = await getUsersDirectory();

  return <UsersClient staff={staff} customers={customers} />;
}
