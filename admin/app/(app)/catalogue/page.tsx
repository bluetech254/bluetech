"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import ProductsTab from "./ProductsTab";
import ServicesTab from "./ServicesTab";

type Tab = "products" | "services";

function CatalogueTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as Tab) ?? "products";

  function switchTab(t: Tab) {
    router.replace(`/catalogue?tab=${t}`);
  }

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-base-panel border border-base-border rounded-xl p-1 w-fit">
        {(["products", "services"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t
                ? "bg-volt text-white shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {t === "products" ? "Products" : "Repair Services"}
          </button>
        ))}
      </div>

      {tab === "products" ? <ProductsTab /> : <ServicesTab />}
    </div>
  );
}

export default function CataloguePage() {
  return (
    <Suspense>
      <CatalogueTabs />
    </Suspense>
  );
}
