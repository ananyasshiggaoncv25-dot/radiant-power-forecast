// Mock forecast data generator for solar & wind probabilistic forecasts.
// Produces hourly P10/P50/P90 bands plus actuals up to "now".

export type AssetType = "solar" | "wind";
export type Horizon = "day-ahead" | "intra-day" | "hourly";

export interface ForecastPoint {
  hour: number;
  label: string;
  p10: number;
  p50: number;
  p90: number;
  actual?: number;
  weather: number; // irradiance for solar (W/m²) or wind speed (m/s)
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  capacity: number; // MW
  region: string;
  cluster: string;
  lat: number;
  lng: number;
}

export const ASSETS: Asset[] = [
  { id: "sol-iberia-01", name: "Iberia Solar Park", type: "solar", capacity: 320, region: "Iberia", cluster: "Iberia Solar Cluster", lat: 38.9, lng: -4.1 },
  { id: "sol-rajasthan-02", name: "Rajasthan PV Field", type: "solar", capacity: 480, region: "South Asia", cluster: "Thar Solar Cluster", lat: 27.0, lng: 71.0 },
  { id: "sol-atacama-03", name: "Atacama Heliostat", type: "solar", capacity: 210, region: "South America", cluster: "Andes Solar Cluster", lat: -23.6, lng: -68.2 },
  { id: "win-northsea-01", name: "North Sea Offshore", type: "wind", capacity: 540, region: "North Europe", cluster: "North Sea Cluster", lat: 56.1, lng: 3.5 },
  { id: "win-texas-02", name: "West Texas Wind Farm", type: "wind", capacity: 410, region: "North America", cluster: "Permian Wind Cluster", lat: 31.8, lng: -102.4 },
  { id: "win-patagonia-03", name: "Patagonia Ridge", type: "wind", capacity: 280, region: "South America", cluster: "Patagonia Wind Cluster", lat: -50.0, lng: -69.5 },
];

// Deterministic pseudo-random for stable mock data
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateForecast(asset: Asset, horizon: Horizon, currentHour = 14): ForecastPoint[] {
  const rand = seeded(asset.id.length * 13 + (horizon === "day-ahead" ? 7 : horizon === "intra-day" ? 11 : 17));
  const hours = 24;
  const out: ForecastPoint[] = [];

  // Uncertainty width shrinks as horizon gets shorter
  const widthFactor = horizon === "day-ahead" ? 0.22 : horizon === "intra-day" ? 0.13 : 0.07;

  for (let h = 0; h < hours; h++) {
    let base = 0;
    let weather = 0;

    if (asset.type === "solar") {
      // Bell curve around solar noon (h=12)
      const x = (h - 12) / 5;
      base = Math.max(0, Math.exp(-x * x) * asset.capacity * (0.78 + rand() * 0.18));
      weather = Math.max(0, Math.exp(-x * x) * 950 + (rand() - 0.5) * 80);
    } else {
      // Wind: noisy diurnal pattern
      const diurnal = 0.6 + 0.35 * Math.sin((h / 24) * Math.PI * 2 + asset.lat * 0.1);
      base = Math.max(0, asset.capacity * diurnal * (0.55 + rand() * 0.4));
      weather = 4 + diurnal * 8 + (rand() - 0.5) * 2;
    }

    const noise = (rand() - 0.5) * asset.capacity * 0.05;
    const p50 = Math.max(0, base + noise);
    const width = p50 * widthFactor + asset.capacity * 0.02;
    const p10 = Math.max(0, p50 - width);
    const p90 = Math.min(asset.capacity, p50 + width);

    const point: ForecastPoint = {
      hour: h,
      label: `${String(h).padStart(2, "0")}:00`,
      p10: round(p10),
      p50: round(p50),
      p90: round(p90),
      weather: round(weather),
    };

    if (h <= currentHour && horizon !== "day-ahead") {
      point.actual = round(Math.max(0, p50 + (rand() - 0.5) * width * 0.8));
    }

    out.push(point);
  }
  return out;
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

export interface ClusterStats {
  totalCapacity: number;
  predictedMWh: number;
  accuracy: number;
  confidence: "High" | "Medium" | "Low";
  mae: number;
}

export function computeStats(points: ForecastPoint[], capacity: number): ClusterStats {
  const predictedMWh = points.reduce((s, p) => s + p.p50, 0);
  const withActual = points.filter((p) => p.actual !== undefined);
  const errors = withActual.map((p) => Math.abs((p.actual as number) - p.p50));
  const mae = errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : 0;
  const accuracy = withActual.length ? Math.max(0, 100 - (mae / capacity) * 100) : 96.4;
  const conf: ClusterStats["confidence"] = accuracy > 95 ? "High" : accuracy > 90 ? "Medium" : "Low";
  return {
    totalCapacity: capacity,
    predictedMWh: round(predictedMWh),
    accuracy: round(accuracy),
    confidence: conf,
    mae: round(mae),
  };
}
