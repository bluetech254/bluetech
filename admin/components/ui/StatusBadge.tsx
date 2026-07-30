import clsx from "clsx";

const STYLES: Record<string, string> = {
  pending: "bg-warn/15 text-warn",
  confirmed: "bg-volt/15 text-volt",
  processing: "bg-lilac/15 text-lilac",
  picked_up: "bg-teal/15 text-teal",
  in_diagnosis: "bg-lilac/15 text-lilac",
  in_repair: "bg-warn/15 text-warn",
  ready: "bg-teal/15 text-teal",
  dispatched: "bg-teal/15 text-teal",
  delivered: "bg-good/15 text-good",
  completed: "bg-good/15 text-good",
  cancelled: "bg-bad/15 text-bad",
  active: "bg-good/15 text-good",
  inactive: "bg-ink-dim/15 text-ink-dim",
  paid: "bg-good/15 text-good",
  unpaid: "bg-bad/15 text-bad",
};

export default function StatusBadge({ status }: { status: string }) {
  const key = status?.toLowerCase() ?? "";
  return (
    <span className={clsx("pill", STYLES[key] ?? "bg-ink-dim/15 text-ink-dim")}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status?.replace(/_/g, " ")}
    </span>
  );
}
