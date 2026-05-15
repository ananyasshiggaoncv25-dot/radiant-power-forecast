import { useI18n } from "@/lib/i18n";
import { ASSETS } from "@/lib/forecast-data";
import {
  Sun, Wind, FileText, Download, Brain, Cpu, Database, Bell,
  Shield, Globe, Gauge, Layers, CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

const SectionShell = ({
  id, title, subtitle, children,
}: { id: string; title: string; subtitle: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24 mt-12">
    <div className="mb-5">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
    {children}
  </section>
);

export const AssetsSection = () => {
  const { t } = useI18n();
  return (
    <SectionShell id="assets" title={t("section.assets.title")} subtitle={t("section.assets.subtitle")}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ASSETS.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                  a.type === "solar" ? "bg-gradient-solar text-solar-foreground" : "bg-gradient-wind text-wind-foreground"
                }`}>
                  {a.type === "solar" ? <Sun className="h-4 w-4" /> : <Wind className="h-4 w-4" />}
                </span>
                <div>
                  <div className="font-medium text-sm">{t(`asset.${a.id}`) || a.name}</div>
                  <div className="text-[11px] text-muted-foreground">{t(`district.${a.district}`)}</div>
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                {t("section.assets.online")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">{t("section.assets.capacity")}</div>
                <div className="font-semibold tabular">{a.capacity} MW</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t("section.assets.cluster")}</div>
                <div className="font-semibold">{a.cluster}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
};

export const ModelsSection = () => {
  const { t } = useI18n();
  const models = [
    { name: "Solar-TFT-Pro", task: t("section.models.solar"), arch: "Temporal Fusion Transformer", mape: 3.8, icon: Sun, tone: "solar" },
    { name: "Wind-TFT-Pro", task: t("section.models.wind"), arch: "Temporal Fusion Transformer", mape: 5.2, icon: Wind, tone: "wind" },
    { name: "Weather-TFT-Ensemble", task: t("section.models.weather"), arch: "Temporal Fusion Transformer", mape: 1.9, icon: Layers, tone: "primary" },
    { name: "Uncertainty-TFT-SHAP", task: t("section.models.uncertainty"), arch: "Temporal Fusion Transformer", mape: null, icon: Brain, tone: "primary" },
  ];
  return (
    <SectionShell id="models" title={t("section.models.title")} subtitle={t("section.models.subtitle")}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map((m) => (
          <div key={m.name} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                  <m.icon className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <div className="font-display font-semibold">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.task}</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                <CheckCircle2 className="h-3 w-3" /> {t("section.models.deployed")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">{t("section.models.arch")}</div>
                <div className="font-medium">{m.arch}</div>
              </div>
              <div>
                <div className="text-muted-foreground">MAPE</div>
                <div className="font-semibold tabular">{m.mape != null ? `${m.mape}%` : "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t("section.models.lastTrain")}</div>
                <div className="font-medium">6h</div>
              </div>
            </div>
          </div>
        ))}
        <div className="md:col-span-2 rounded-2xl border border-dashed border-border bg-secondary/30 p-5 text-center text-sm text-muted-foreground">
          <Cpu className="h-5 w-5 mx-auto mb-2 opacity-60" />
          {t("section.models.upload")}
        </div>
      </div>
    </SectionShell>
  );
};

import { useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generateForecast, type Horizon } from "@/lib/forecast-data";
const REPORT_REFRESH_MS = 15 * 60 * 1000; // 15 minutes

function buildReportPdf(reportName: string, horizon: Horizon): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const now = new Date();

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(reportName, 40, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Karnataka Renewable Forecast — generated ${now.toLocaleString()}`,
    40,
    68,
  );
  doc.text(`Horizon: ${horizon}`, 40, 82);

  // Per-asset summary table
  const rows = ASSETS.map((a) => {
    const data = generateForecast(a, horizon, now.getHours(), Math.floor(now.getTime() / REPORT_REFRESH_MS));
    const predicted = data.reduce((s, p) => s + p.p50, 0);
    const peak = Math.max(...data.map((p) => p.p50));
    const band =
      data.reduce((s, p) => s + (p.p90 - p.p10), 0) / data.length;
    return [
      a.name,
      a.type.toUpperCase(),
      a.district,
      `${a.capacity} MW`,
      `${predicted.toFixed(1)} MWh`,
      `${peak.toFixed(1)} MW`,
      `±${band.toFixed(1)} MW`,
    ];
  });

  autoTable(doc, {
    startY: 100,
    head: [["Asset", "Type", "District", "Capacity", "24h Predicted", "Peak", "Avg Band"]],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    "Auto-regenerated every 15 minutes from the latest forecast snapshot.",
    40,
    doc.internal.pageSize.getHeight() - 30,
  );

  return doc.output("blob");
}

export const ReportsSection = () => {
  const { t } = useI18n();

  const buildReports = () => {
    const now = new Date();
    return [
      { name: t("section.reports.daily"),    horizon: "day-ahead" as Horizon, date: now.toISOString().split("T")[0] },
      { name: t("section.reports.weekly"),   horizon: "intra-day" as Horizon, date: new Date(now.getTime() - 3 * 86400000).toISOString().split("T")[0] },
      { name: t("section.reports.monthly"),  horizon: "hourly"    as Horizon, date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0] },
      { name: t("section.reports.accuracy"), horizon: "intra-day" as Horizon, date: new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0] },
    ];
  };

  const [reports, setReports] = useState(buildReports);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());

  // Regenerate report metadata every 15 minutes so the next download is fresh
  useEffect(() => {
    const id = window.setInterval(() => {
      setReports(buildReports());
      setGeneratedAt(new Date());
    }, REPORT_REFRESH_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = (reportName: string, horizon: Horizon) => {
    const blob = buildReportPdf(reportName, horizon);
    const url = URL.createObjectURL(blob);
    const filename = `${reportName.replace(/\s+/g, "_")}_${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.pdf`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast({
      title: t("section.reports.completeTitle"),
      description: `${t("section.reports.downloaded")} ${reportName}`,
    });
  };

  return (
    <SectionShell
      id="reports"
      title={t("section.reports.title")}
      subtitle={`${t("section.reports.subtitle")} · refreshed ${generatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
    >
      <div className="rounded-2xl border border-border bg-card shadow-card divide-y divide-border">
        {reports.map((r) => (
          <div key={r.name} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium text-sm">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.date} · PDF · {r.horizon}
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                    <CheckCircle2 className="h-3 w-3" /> Auto-generated
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDownload(r.name, r.horizon)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> {t("section.reports.download")}
            </button>
          </div>
        ))}
        <div className="p-4 text-center text-xs text-muted-foreground bg-secondary/30">
          {t("section.reports.upload")}
        </div>
      </div>
    </SectionShell>
  );
};


export const SettingsSection = () => {
  const { t, lang, setLang } = useI18n();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alerts, setAlerts] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [units, setUnits] = useState<"MW" | "kW">("MW");

  const Row = ({ icon: Icon, title, desc, children }: any) => (
    <div className="flex items-center justify-between p-4 gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  return (
    <SectionShell id="settings" title={t("section.settings.title")} subtitle={t("section.settings.subtitle")}>
      <div className="rounded-2xl border border-border bg-card shadow-card divide-y divide-border">
        <Row icon={Globe} title={t("section.settings.language")} desc={t("section.settings.languageDesc")}>
          <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
            <button onClick={() => setLang("en")} className={`px-3 py-1.5 ${lang === "en" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>EN</button>
            <button onClick={() => setLang("kn")} className={`px-3 py-1.5 ${lang === "kn" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>ಕನ್ನಡ</button>
          </div>
        </Row>
        <Row icon={Gauge} title={t("section.settings.units")} desc={t("section.settings.unitsDesc")}>
          <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
            <button onClick={() => setUnits("MW")} className={`px-3 py-1.5 ${units === "MW" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>MW</button>
            <button onClick={() => setUnits("kW")} className={`px-3 py-1.5 ${units === "kW" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>kW</button>
          </div>
        </Row>
        <Row icon={Database} title={t("section.settings.autoRefresh")} desc={t("section.settings.autoRefreshDesc")}>
          <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
        </Row>
        <Row icon={Bell} title={t("section.settings.alerts")} desc={t("section.settings.alertsDesc")}>
          <Switch checked={alerts} onCheckedChange={setAlerts} />
        </Row>
        <Row icon={Shield} title={t("section.settings.contrast")} desc={t("section.settings.contrastDesc")}>
          <Switch checked={highContrast} onCheckedChange={setHighContrast} />
        </Row>
      </div>
    </SectionShell>
  );
};
