import { redirect } from "next/navigation";

export default function ProductsPage() {
  redirect("/catalogue?tab=products");
}
