import { redirect } from "next/navigation";

export default function RevenuePage() {
  redirect("/analytics?tab=revenue");
}
