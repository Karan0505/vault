import { redirect } from "next/navigation";

export default function AdminSignInPage() {
  redirect("/login?callbackUrl=/admin");
}
