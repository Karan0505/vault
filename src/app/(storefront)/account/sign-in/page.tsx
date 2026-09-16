import { redirect } from "next/navigation";

export default function CustomerSignInPage() {
  redirect("/login?callbackUrl=/cart");
}
