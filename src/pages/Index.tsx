import { useMemo, useState } from "react";
import { Activity, Gauge, Sparkles, Sun, TrendingUp, Wind } from "lucide-react";
import { Header } from "@/components/forecast/Header";
import { KpiCard } from "@/components/forecast/KpiCard";
import { ForecastChart } from "@/components/forecast/ForecastChart";
import { AssetSelector } from "@/components/forecast/AssetSelector";
import { WeatherPanel } from "@/components/forecast/WeatherPanel";
import { HorizonTabs } from "@/components/forecast/HorizonTabs";
import { ASSETS, AssetType, Horizon, computeStats, generateForecast } from "@/lib/forecast-data";

const Index = () => {
  const [selectedId, setSelectedId] = useState(ASSETS[0].id);
  const [filter, setFilter] = useState<AssetType | "all">("all");
  const [horizon, setHorizon] = useState<Horizon>("intra-day");

  const asset = useMemo(() => ASSETS.find((a) => a.id === selectedId)!, [selectedId]);
  const data = useMemo(() => generateForecast(asset, horizon), [asset, horizon]);
  const stats = useMemo(() => computeStats(data, asset.capacity), [data, asset]);

  const peak = Math.max(...data.map((d) => d.p50));
  const avgBandWidth =
    data.reduce((s, d) => s + (d.p90 - d.p10), 0) / data.length;

  return (
    <div className="min-h-screen bg-gradient-surface">
      <Header />

      <main className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8 lg:py-12">
        {/* Hero */}
        <section className="mb-8 lg:mb-10 animate-fade-in-up">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/8 text-primary border border-primary/15 mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Unified model · solar + wind · Karnataka grid</span>
              </div>
              <h1 className="font-display text-4xl lg:text-5xl font-semibold leading-[1.05] tracking-tight">
                Forecast every megawatt
                <span className="block text-muted-foreground font-normal italic">
                  with calibrated uncertainty.
                </span>
              </h1>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-xl">
                Day-ahead, intra-day and hourly probabilistic predictions for solar and wind plants
                across Karnataka — trained on IMD &amp; ECMWF weather data and KPTCL operational
                telemetry, generalising from Pavagada to Chitradurga without per-site retraining.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2.5 text-sm font-medium rounded-xl border border-border bg-card hover:bg-secondary/60 transition-colors">
                Export forecast
              </button>
              <button className="px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-hero text-primary-foreground shadow-elevated hover:shadow-glow transition-all">
                Run new prediction
              </button>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label="Forecast accuracy"
            value={stats.accuracy.toFixed(1)}
            unit="%"
            badge={{ text: "24h MAPE", tone: "success" }}
            hint={`MAE ${stats.mae} MW vs ${asset.capacity} MW capacity`}
          />
          <KpiCard
            label="Predicted energy"
            value={(stats.predictedMWh / 1000).toFixed(2)}
            unit="GWh"
            badge={{
              text: asset.type === "solar" ? "Solar" : "Wind",
              tone: asset.type === "solar" ? "solar" : "wind",
            }}
            hint={`Peak ${peak.toFixed(0)} MW · over next 24h`}
          />
          <KpiCard
            label="Model confidence"
            value={stats.confidence}
            badge={{ text: `±${(avgBandWidth / 2).toFixed(0)} MW`, tone: "neutral" }}
            hint="Average P10–P90 band half-width"
          />
          <KpiCard
            label="Capacity factor"
            value={((stats.predictedMWh / 24 / asset.capacity) * 100).toFixed(0)}
            unit="%"
            badge={{ text: horizon, tone: "neutral" }}
            hint={`Cluster: ${asset.cluster}`}
          />
        </section>

        {/* Main grid */}
        <section className="grid grid-cols-1 lg:grid-cols-[300px_1fr_280px] gap-5">
          <AssetSelector
            selectedId={selectedId}
            onSelect={setSelectedId}
            filter={filter}
            onFilterChange={setFilter}
          />

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${
                      asset.type === "solar"
                        ? "bg-gradient-solar text-solar-foreground"
                        : "bg-gradient-wind text-wind-foreground"
                    }`}
                  >
                    {asset.type === "solar" ? <Sun className="h-3.5 w-3.5" /> : <Wind className="h-3.5 w-3.5" />}
                  </span>
                  <h2 className="font-display text-xl font-semibold">{asset.name}</h2>
                </div>
                <div className="text-sm text-muted-foreground">
                  {asset.cluster} · {asset.region} · {asset.capacity} MW installed
                </div>
              </div>
              <HorizonTabs value={horizon} onChange={setHorizon} />
            </div>

            <ForecastChart data={data} assetType={asset.type} capacity={asset.capacity} />

            <div className="mt-6 pt-5 border-t border-border grid grid-cols-3 gap-4">
              <MiniStat icon={TrendingUp} label="Peak generation" value={`${peak.toFixed(0)} MW`} />
              <MiniStat icon={Gauge} label="Uncertainty (avg)" value={`±${(avgBandWidth / 2).toFixed(0)} MW`} />
              <MiniStat icon={Activity} label="Resolution" value="60 min" />
            </div>
          </div>

          <div className="space-y-5">
            <WeatherPanel asset={asset} />
            <ModelCard horizon={horizon} />
          </div>
        </section>

        <footer className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© 2026 Aether Energy · Probabilistic generation forecasting</div>
          <div className="flex items-center gap-4">
            <span>v3.4.0</span>
            <span>·</span>
            <span>Last training: 6h ago</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

const MiniStat = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3">
    <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular">{value}</div>
    </div>
  </div>
);

const ModelCard = ({ horizon }: { horizon: Horizon }) => (
  <div className="rounded-2xl border border-border bg-gradient-hero p-5 shadow-elevated text-primary-foreground overflow-hidden relative">
    <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary-glow/30 blur-3xl" />
    <div className="relative">
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80 mb-3">
        Active model
      </div>
      <div className="font-display text-lg font-semibold leading-tight mb-1">
        AetherNet · Quantile Transformer
      </div>
      <div className="text-xs opacity-80 mb-4">
        Multi-horizon, multi-asset, geography-agnostic. Outputs full P5–P95 distribution.
      </div>
      <div className="space-y-2 text-xs">
        <Row k="Horizon" v={horizon} />
        <Row k="Inputs" v="NWP · SCADA · climatology" />
        <Row k="Calibration" v="0.94 (CRPS)" />
      </div>
    </div>
  </div>
);

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex items-center justify-between gap-4 py-1 border-b border-primary-foreground/10 last:border-0">
    <span className="opacity-70">{k}</span>
    <span className="font-medium tabular capitalize">{v}</span>
  </div>
);

export default Index;
