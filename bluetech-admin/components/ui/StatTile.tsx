import { LucideIcon } from "lucide-react";
import clsx from "clsx";

const tones = {
  amber: "bg-amber-tile text-[#3A2405]",
  lilac: "bg-lilac-tile text-[#241B4D]",
  lime: "bg-lime-tile text-[#1F2B04]",
  coral: "bg-coral-tile text-[#3B1109]",
};

export default function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone: keyof typeof tones;
}) {
  return (
    <div className={clsx("rounded-2xl p-5 flex flex-col justify-between min-h-[136px] shadow-card", tones[tone])}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
        <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
          <Icon size={16} strokeWidth={2.25} />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold tabular tracking-tight">{value}</div>
        {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
