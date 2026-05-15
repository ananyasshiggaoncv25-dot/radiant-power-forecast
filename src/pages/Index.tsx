import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Gauge, Sparkles, Sun, TrendingUp, Wind } from "lucide-react";
import { Header } from "@/components/forecast/Header";
import { KpiCard } from "@/components/forecast/KpiCard";
import { ForecastChart } from "@/components/forecast/ForecastChart";
import { AssetSelector } from "@/components/forecast/AssetSelector";
import { WeatherPanel } from "@/components/forecast/WeatherPanel";
import { HorizonTabs } from "@/components/forecast/HorizonTabs";
import { KarnatakaMap } from "@/components/forecast/KarnatakaMap";
import { DistrictFilter } from "@/components/forecast/DistrictFilter";
import { RefreshControl } from "@/components/forecast/RefreshControl";
import { UncertaintyBreakdown } from "@/components/forecast/UncertaintyBreakdown";
import { AssetsSection, ModelsSection, ReportsSection, SettingsSection } from "@/components/forecast/Sections";
import {
  ASSETS,
  AssetType,
  DISTRICTS,
  District,
  Horizon,
  computeStats,
} from "@/lib/forecast-data";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";
import { 
  initializeBuffer, 
  addDataPoint, 
  bufferToForecastPoints, 
  type DataBuffer 
} from "@/lib/real-data";

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const TICK_MS = 1000;

const Index = () => {
  const { t } = useI18n();
  const [district, setDistrict] = useState<District | "all">("all");
  const [filter, setFilter] = useState<AssetType | "all">("all");
  const [selectedId, setSelectedId] = useState(ASSETS[0].id);
  const [horizon, setHorizon] = useState<Horizon>("intra-day");

  const [revision, setRevision] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [nextInMs, setNextInMs] = useState(REFRESH_INTERVAL_MS);
  
  // Data buffer for sliding window effect
  const [dataBuffer, setDataBuffer] = useState<DataBuffer>(() => 
    initializeBuffer(ASSETS[0], "intra-day", 48)
  );

  // District counts for the chip filter
  const districtCounts = useMemo(() => {
    const c: Record<string, number> = { all: ASSETS.length };
    DISTRICTS.forEach((d) => (c[d] = ASSETS.filter((a) => a.district === d).length));
    return c as Record<District | "all", number>;
  }, []);

  // Filter assets by district + type
  const visibleAssets = useMemo(
    () =>
      ASSETS.filter(
        (a) => (district === "all" || a.district === district) && (filter === "all" || a.type === filter)
      ),
    [district, filter]
  );

  // Keep the selected asset valid given the filters
  useEffect(() => {
    if (!visibleAssets.find((a) => a.id === selectedId) && visibleAssets[0]) {
      setSelectedId(visibleAssets[0].id);
    }
  }, [visibleAssets, selectedId]);

  const asset = useMemo(
    () => ASSETS.find((a) => a.id === selectedId) ?? ASSETS[0],
    [selectedId]
  );

  // Reinitialize buffer when asset or horizon changes
  useEffect(() => {
    setDataBuffer(initializeBuffer(asset, horizon, 48));
  }, [asset, horizon]);

  // Convert buffer to forecast points for the chart
  const data = useMemo(
    () => bufferToForecastPoints(dataBuffer),
    [dataBuffer]
  );
  
  // Previous data for delta highlighting (use last 24 points from buffer)
  const prevData = useMemo(() => {
    if (dataBuffer.data.length < 24) return data;
    const prevPoints = dataBuffer.data.slice(-24);
    return bufferToForecastPoints({ data: prevPoints, maxPoints: 24 });
  }, [dataBuffer, data]);

  const stats = useMemo(() => computeStats(data, asset.capacity), [data, asset]);
  const prevStats = useMemo(
    () => computeStats(prevData, asset.capacity),
    [prevData, asset]
  );

  const peak = Math.max(...data.map((d) => d.p50));
  const avgBandWidth = data.reduce((s, d) => s + (d.p90 - d.p10), 0) / data.length;

  const deltaPredicted = stats.predictedMWh - prevStats.predictedMWh;
  const deltaAccuracy = stats.accuracy - prevStats.accuracy;
  const deltaBand = avgBandWidth - prevData.reduce((s, d) => s + (d.p90 - d.p10), 0) / prevData.length;

  // KPIs for the active district scope (sum across visible assets, current horizon)
  const scopeStats = useMemo(() => {
    const totalCap = visibleAssets.reduce((s, a) => s + a.capacity, 0);
    const totalPredicted = visibleAssets.reduce((s, a) => {
      const buffer = initializeBuffer(a, horizon, 24);
      const d = bufferToForecastPoints(buffer);
      return s + d.reduce((ss, p) => ss + p.p50, 0);
    }, 0);
    return { totalCap, totalPredicted };
  }, [visibleAssets, horizon]);

  // ---- Auto-refresh loop ----
  const triggerRefresh = (silent = false) => {
    // Add new data point instead of regenerating everything
    const now = new Date();
    const newHour = now.getHours();
    const newPoint = {
      timestamp: now,
      hour: newHour,
      p10: 0,
      p50: 0,
      p90: 0,
      actual: 0,
      weather: 0,
    };
    
    // Generate realistic new point
    const { type, capacity, lat } = asset;
    const widthFactor = horizon === "day-ahead" ? 0.22 : horizon === "intra-day" ? 0.13 : 0.07;
    let base = 0;
    let weather = 0;
    
    const seed = now.getTime() % 10000;
    const rand = () => {
      const x = Math.sin(seed) * 10000;
      return (x - Math.floor(x));
    };
    
    if (type === "solar") {
      const solarNoon = 12;
      const x = (newHour - solarNoon) / 4.5;
      const baseCurve = Math.max(0, Math.exp(-x * x));
      const month = now.getMonth();
      const seasonalFactor = 0.85 + 0.3 * Math.sin((month / 12) * Math.PI * 2 - Math.PI / 2);
      const cloudCover = 0.7 + rand() * 0.3;
      base = baseCurve * capacity * 0.82 * seasonalFactor * cloudCover;
      weather = Math.max(0, baseCurve * 1000 * cloudCover + (rand() - 0.5) * 100);
    } else {
      const diurnal = 0.5 + 0.4 * Math.sin((newHour / 24) * Math.PI * 2 - Math.PI / 4);
      const turbulence = 1 + (rand() - 0.5) * 0.3;
      base = Math.max(0, capacity * diurnal * 0.65 * turbulence);
      weather = 3 + diurnal * 10 * turbulence + (rand() - 0.5) * 3;
    }
    
    const noise = (rand() - 0.5) * capacity * 0.03;
    const p50 = Math.max(0, base + noise);
    const width = p50 * widthFactor + capacity * 0.015;
    const round = (n: number): number => Math.round(n * 10) / 10;
    
    newPoint.p10 = round(Math.max(0, p50 - width));
    newPoint.p50 = round(p50);
    newPoint.p90 = round(Math.min(capacity, p50 + width));
    newPoint.actual = round(Math.max(0, p50 + (rand() - 0.5) * width * 0.6));
    newPoint.weather = round(weather);
    
    setDataBuffer(prev => addDataPoint(prev, newPoint));
    setRevision((r) => r + 1);
    setLastUpdated(now);
    setNextInMs(REFRESH_INTERVAL_MS);
    
    if (!silent) {
      toast({
        title: t("refresh.toastTitle"),
        description: `${t("refresh.updated")} ${now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      });
    }
  };

  const tickRef = useRef<number | null>(null);
  useEffect(() => {
    if (!autoRefresh) {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    setNextInMs(REFRESH_INTERVAL_MS);
    setLastUpdated(new Date());
    tickRef.current = window.setInterval(() => {
      setNextInMs((ms) => {
        const next = ms - TICK_MS;
        if (next <= 0) {
          // refresh
          setRevision((r) => r + 1);
          setLastUpdated(new Date());
          return REFRESH_INTERVAL_MS;
        }
        return next;
      });
    }, TICK_MS);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [autoRefresh]);

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
                <span>{t("hero.badge")}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RefreshControl
                enabled={autoRefresh}
                onToggle={() => setAutoRefresh((v) => !v)}
                onRefresh={() => triggerRefresh(false)}
                lastUpdated={lastUpdated}
                nextInMs={nextInMs}
                intervalMs={REFRESH_INTERVAL_MS}
              />
              <button className="px-4 py-2.5 text-sm font-medium rounded-xl bg-gradient-hero text-primary-foreground shadow-elevated hover:shadow-glow transition-all">
                {t("hero.runPrediction")}
              </button>
            </div>
          </div>
        </section>

        {/* District filter */}
        <section className="mb-6">
          <DistrictFilter value={district} onChange={setDistrict} counts={districtCounts} />
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label={t("kpi.accuracy")}
            value={stats.accuracy.toFixed(1)}
            unit="%"
            badge={{ text: t("kpi.accuracy.badge"), tone: "success" }}
            hint={t("kpi.accuracy.hint", { mae: stats.mae, cap: asset.capacity })}
            delta={
              revision > 0
                ? { value: deltaAccuracy, unit: "pp", goodDirection: "up" }
                : undefined
            }
          />
          <KpiCard
            label={t("kpi.predicted")}
            value={(stats.predictedMWh / 1000).toFixed(2)}
            unit="GWh"
            badge={{
              text: asset.type === "solar" ? t("assets.solar") : t("assets.wind"),
              tone: asset.type === "solar" ? "solar" : "wind",
            }}
            hint={t("kpi.predicted.hint", { peak: peak.toFixed(0) })}
            delta={
              revision > 0
                ? { value: deltaPredicted / 1000, unit: "GWh", goodDirection: "up" }
                : undefined
            }
          />
          <KpiCard
            label={t("kpi.confidence")}
            value={stats.confidence}
            badge={{ text: `±${(avgBandWidth / 2).toFixed(0)} MW`, tone: "neutral" }}
            hint={t("kpi.confidence.hint")}
            delta={
              revision > 0
                ? { value: deltaBand / 2, unit: "MW", goodDirection: "down" }
                : undefined
            }
          />
          <KpiCard
            label={
              district === "all"
                ? t("kpi.scope.all")
                : t("kpi.scope.district", { district: t(`district.${district}`) })
            }
            value={(scopeStats.totalPredicted / 1000).toFixed(1)}
            unit="GWh"
            badge={{ text: t("kpi.plants", { n: visibleAssets.length }), tone: "neutral" }}
            hint={t("kpi.scope.hint", {
              cap: scopeStats.totalCap.toLocaleString(),
              horizon: t(`horizon.${horizon}`),
            })}
          />
        </section>

        {/* Main grid */}
        <section className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-5">
          <div className="space-y-5">
            <KarnatakaMap
              selectedId={selectedId}
              onSelect={setSelectedId}
              districtFilter={district}
            />
            <AssetSelector
              selectedId={selectedId}
              onSelect={setSelectedId}
              filter={filter}
              onFilterChange={setFilter}
              assets={visibleAssets}
            />
          </div>

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
                    {asset.type === "solar" ? (
                      <Sun className="h-3.5 w-3.5" />
                    ) : (
                      <Wind className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <h2 className="font-display text-xl font-semibold">{asset.name}</h2>
                  {revision > 0 && (
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {t("chart.rev")} {revision}
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t(`district.${asset.district}`)} · {asset.cluster} ·{" "}
                  {t("chart.installed", { cap: asset.capacity })}
                </div>
              </div>
              <HorizonTabs value={horizon} onChange={setHorizon} />
            </div>

            <ForecastChart data={data} assetType={asset.type} capacity={asset.capacity} />

            <div className="mt-6 pt-5 border-t border-border grid grid-cols-3 gap-4">
              <MiniStat icon={TrendingUp} label={t("chart.peak")} value={`${peak.toFixed(0)} MW`} />
              <MiniStat
                icon={Gauge}
                label={t("chart.uncertainty")}
                value={`±${(avgBandWidth / 2).toFixed(0)} MW`}
              />
              <MiniStat icon={Activity} label={t("chart.resolution")} value="60 min" />
            </div>
          </div>

          <div className="space-y-5">
            <UncertaintyBreakdown
              asset={asset}
              horizon={horizon}
              avgBandWidth={avgBandWidth}
            />
            <WeatherPanel asset={asset} />
          </div>
        </section>

        <AssetsSection />
        <ModelsSection />
        <ReportsSection />
        <SettingsSection />

        <footer className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>{t("footer.copyright")}</div>
          <div className="flex items-center gap-4">
            <span>v3.4.0</span>
            <span>·</span>
            <span>
              {t("footer.lastTraining", {
                rev: revision,
                time: lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              })}
            </span>
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

export default Index;
