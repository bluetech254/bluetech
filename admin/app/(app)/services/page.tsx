import { redirect } from "next/navigation";

export default function ServicesPage() {
  redirect("/catalogue?tab=services");
}
