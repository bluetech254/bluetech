import clsx from "clsx";

const styles: Record<string, string> = {
  pending: "bg-amber-tile/15 text-amber-tile",
  confirmed: "bg-volt/15 text-volt",
  processing: "bg-lilac-tile/15 text-lilac-tile",
  picked_up: "bg-lilac-tile/15 text-lilac-tile",
  in_diagnosis: "bg-coral-tile/15 text-coral-tile",
  in_repair: "bg-coral-tile/15 text-coral-tile",
  dispatched: "bg-volt/15 text-volt",
  ready: "bg-good/15 text-good",
  delivered: "bg-good/15 text-good",
  completed: "bg-good/15 text-good",
  cancelled: "bg-bad/15 text-bad",
  paid: "bg-good/15 text-good",
  unpaid: "bg-bad/15 text-bad",
  active: "bg-good/15 text-good",
  inactive: "bg-ink-dim/20 text-ink-muted",
};

const labels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  picked_up: "Picked up",
  in_diagnosis: "In diagnosis",
  in_repair: "In repair",
  dispatched: "Dispatched",
  ready: "Ready",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  paid: "Paid",
  unpaid: "Unpaid",
  active: "Active",
  inactive: "Inactive",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("pill", styles[status] ?? "bg-ink-dim/20 text-ink-muted")}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {labels[status] ?? status}
    </span>
  );
}
