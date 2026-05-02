import { cn } from "@/lib/utils";
import type { Horizon } from "@/lib/forecast-data";

interface Props {
  value: Horizon;
  onChange: (h: Horizon) => void;
}

const TABS: { id: Horizon; label: string; sub: string }[] = [
  { id: "day-ahead", label: "Day-ahead", sub: "T+24h" },
  { id: "intra-day", label: "Intra-day", sub: "T+6h" },
  { id: "hourly", label: "Hourly", sub: "T+1h" },
];

export const HorizonTabs = ({ value, onChange }: Props) => (
  <div className="inline-flex p-1 bg-secondary rounded-xl">
    {TABS.map((t) => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={cn(
          "px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2",
          value === t.id
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span>{t.label}</span>
        <span className="tabular text-[10px] opacity-70">{t.sub}</span>
      </button>
    ))}
  </div>
);
