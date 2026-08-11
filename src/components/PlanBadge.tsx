import type { Tier } from "../context/SubscriptionContext";

const STYLES: Record<Tier, string> = {
  free: "bg-slate-700 text-slate-200",
  pro: "bg-brand-600 text-white",
  team: "bg-amber-500 text-slate-900",
};

const LABELS: Record<Tier, string> = {
  free: "FREE",
  pro: "PRO",
  team: "TIME",
};

export function PlanBadge({ tier }: { tier: Tier }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STYLES[tier]}`}>
      {LABELS[tier]}
    </span>
  );
}