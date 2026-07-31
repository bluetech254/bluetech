import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import clsx from "clsx";

export default function StatCard({
  label,
  value,
  icon: Icon,
  change,
  gradient = false,
  caption = "Compare to last month",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  change?: number;
  gradient?: boolean;
  caption?: string;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <div className={clsx("p-5 relative", gradient ? "card-gradient" : "card")}>
      <div className="flex items-center justify-between">
        <p className={clsx("text-sm font-medium", gradient ? "text-white/85" : "text-ink-muted")}>{label}</p>
        <div
          className={clsx(
            "w-9 h-9 rounded-xl flex items-center justify-center",
            gradient ? "bg-white/15" : "bg-volt/10"
          )}
        >
          <Icon size={16} className={gradient ? "text-white" : "text-volt"} />
        </div>
      </div>
      <p className={clsx("font-display font-bold text-2xl mt-3 tabular", gradient ? "text-white" : "text-ink")}>
        {value}
      </p>
      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-2.5">
          <span
            className={clsx(
              "pill !px-1.5 !py-0.5",
              gradient
                ? "bg-white/20 text-white"
                : positive
                ? "bg-good/20 text-good"
                : "bg-bad/20 text-bad"
            )}
          >
            {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(change)}%
          </span>
          <span className={clsx("text-xs", gradient ? "text-white/70" : "text-ink-dim")}>{caption}</span>
        </div>
      )}
    </div>
  );
}
