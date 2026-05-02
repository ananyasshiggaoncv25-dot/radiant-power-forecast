import { useMemo } from "react";
import { Sun, Wind } from "lucide-react";
import { ASSETS, type Asset, type District } from "@/lib/forecast-data";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  districtFilter: District | "all";
}

// SVG canvas in lat/lng space (mercator-ish, simple equirectangular).
// Karnataka rough bounds: lat 11.5–18.5, lng 74–78.7.
const VIEW = { minLat: 11.4, maxLat: 18.6, minLng: 73.9, maxLng: 78.8 };
const W = 360;
const H = 460;

function project(lat: number, lng: number) {
  const x = ((lng - VIEW.minLng) / (VIEW.maxLng - VIEW.minLng)) * W;
  const y = ((VIEW.maxLat - lat) / (VIEW.maxLat - VIEW.minLat)) * H;
  return { x, y };
}

// Stylised Karnataka outline (hand-tuned approximation in lat/lng).
const OUTLINE: [number, number][] = [
  [18.4, 74.5], [18.3, 75.2], [18.0, 76.1], [17.7, 77.0], [17.3, 77.6],
  [16.8, 77.7], [16.2, 77.5], [15.7, 77.5], [15.2, 77.4], [14.8, 77.6],
  [14.2, 78.0], [13.7, 78.6], [13.2, 78.4], [12.7, 78.1], [12.3, 77.8],
  [11.9, 77.2], [11.6, 76.6], [11.7, 76.0], [12.0, 75.5], [12.5, 75.2],
  [13.0, 74.9], [13.6, 74.7], [14.2, 74.5], [14.8, 74.4], [15.4, 74.1],
  [16.0, 74.0], [16.6, 74.1], [17.2, 74.2], [17.8, 74.3], [18.4, 74.5],
];

const DISTRICT_LABELS: { name: District; lat: number; lng: number }[] = [
  { name: "Kalaburagi", lat: 17.33, lng: 76.83 },
  { name: "Koppal", lat: 15.55, lng: 76.15 },
  { name: "Gadag", lat: 15.43, lng: 75.63 },
  { name: "Ballari", lat: 15.10, lng: 76.85 },
  { name: "Chitradurga", lat: 14.23, lng: 76.40 },
  { name: "Tumakuru", lat: 13.65, lng: 77.10 },
];

export const KarnatakaMap = ({ selectedId, onSelect, districtFilter }: Props) => {
  const { t: tt } = useI18n();
  const outlinePath = useMemo(() => {
    const pts = OUTLINE.map(([lat, lng]) => project(lat, lng));
    return (
      "M " +
      pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ") +
      " Z"
    );
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-base font-semibold">{tt("map.title")}</h3>
          <div className="text-xs text-muted-foreground">
            {tt("map.subtitle")}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-solar" /> {tt("map.solar")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-wind" /> {tt("map.wind")}
          </span>
        </div>
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Map of Karnataka plants"
        >
          <defs>
            <radialGradient id="kn-fill" cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="hsl(var(--primary) / 0.12)" />
              <stop offset="100%" stopColor="hsl(var(--primary) / 0.03)" />
            </radialGradient>
            <filter id="pin-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>

          {/* Outline */}
          <path
            d={outlinePath}
            fill="url(#kn-fill)"
            stroke="hsl(var(--primary) / 0.5)"
            strokeWidth={1.2}
            strokeLinejoin="round"
          />

          {/* District labels */}
          {DISTRICT_LABELS.map((d) => {
            const { x, y } = project(d.lat, d.lng);
            const dim =
              districtFilter !== "all" && districtFilter !== d.name;
            return (
              <text
                key={d.name}
                x={x}
                y={y - 14}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  opacity: dim ? 0.25 : 0.85,
                  transition: "opacity 200ms",
                }}
              >
                {d.name}
              </text>
            );
          })}

          {/* Plant markers */}
          {ASSETS.map((a) => {
            const { x, y } = project(a.lat, a.lng);
            const active = a.id === selectedId;
            const dim =
              districtFilter !== "all" && a.district !== districtFilter;
            return (
              <Marker
                key={a.id}
                asset={a}
                x={x}
                y={y}
                active={active}
                dim={dim}
                onClick={() => onSelect(a.id)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const Marker = ({
  asset,
  x,
  y,
  active,
  dim,
  onClick,
}: {
  asset: Asset;
  x: number;
  y: number;
  active: boolean;
  dim: boolean;
  onClick: () => void;
}) => {
  const color = asset.type === "solar" ? "hsl(var(--solar))" : "hsl(var(--wind))";
  const r = active ? 8 : 6;
  return (
    <g
      onClick={onClick}
      style={{ cursor: "pointer", opacity: dim ? 0.2 : 1, transition: "opacity 200ms" }}
      className="group"
    >
      {active && (
        <circle cx={x} cy={y} r={16} fill={color} opacity={0.18}>
          <animate attributeName="r" values="10;20;10" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0;0.35" dur="2.4s" repeatCount="indefinite" />
        </circle>
      )}
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={color}
        stroke="hsl(var(--card))"
        strokeWidth={2}
        className={cn("transition-all", !active && "group-hover:r-7")}
      />
      <foreignObject x={x + 8} y={y - 18} width={140} height={36}>
        <div
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-card/95 border border-border shadow-sm whitespace-nowrap",
            active ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
          )}
        >
          {asset.type === "solar" ? (
            <Sun className="h-2.5 w-2.5 text-solar" />
          ) : (
            <Wind className="h-2.5 w-2.5 text-wind" />
          )}
          <span className="truncate max-w-[120px]">{asset.name}</span>
        </div>
      </foreignObject>
    </g>
  );
};
