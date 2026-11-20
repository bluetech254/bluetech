"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import AnalyticsTab from "./AnalyticsTab";
import RevenueTab from "./RevenueTab";
import TransactionsTab from "./TransactionsTab";

type Tab = "analytics" | "revenue" | "transactions";

function AnalyticsTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as Tab) ?? "analytics";

  function switchTab(t: Tab) {
    router.replace(`/analytics?tab=${t}`);
  }

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-base-panel border border-base-border rounded-xl p-1 w-fit">
        {(["analytics", "revenue", "transactions"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t
                ? "bg-volt text-white shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "analytics" && <AnalyticsTab />}
      {tab === "revenue" && <RevenueTab />}
      {tab === "transactions" && <TransactionsTab />}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense>
      <AnalyticsTabs />
    </Suspense>
  );
}
