import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  badge?: { text: string; tone?: "success" | "solar" | "wind" | "neutral" };
  hint?: string;
  className?: string;
}

const toneClasses: Record<string, string> = {
  success: "bg-success/12 text-success",
  solar: "bg-solar/15 text-solar-foreground border border-solar/30",
  wind: "bg-wind/15 text-wind border border-wind/30",
  neutral: "bg-secondary text-secondary-foreground",
};

export const KpiCard = ({ label, value, unit, badge, hint, className }: KpiCardProps) => {
  return (
    <div
      className={cn(
        "group rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {badge && (
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full",
              toneClasses[badge.tone ?? "neutral"]
            )}
          >
            {badge.text}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-semibold tabular text-foreground leading-none">
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="mt-3 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
};
