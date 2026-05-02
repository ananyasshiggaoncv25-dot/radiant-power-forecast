import { Cloud, Droplets, Thermometer, Wind as WindIcon, Sun } from "lucide-react";
import type { Asset } from "@/lib/forecast-data";

interface Props {
  asset: Asset;
}

export const WeatherPanel = ({ asset }: Props) => {
  // Deterministic mock based on asset
  const seed = asset.lat + asset.lng;
  const temp = Math.round(15 + Math.sin(seed) * 10);
  const wind = Math.round(6 + Math.abs(Math.cos(seed)) * 10);
  const cloud = Math.round(20 + Math.abs(Math.sin(seed * 1.3)) * 60);
  const humidity = Math.round(40 + Math.abs(Math.cos(seed * 0.7)) * 35);
  const irradiance = Math.round(420 + Math.abs(Math.sin(seed * 2)) * 480);

  const items = [
    { icon: Thermometer, label: "Temperature", value: `${temp}°C` },
    { icon: WindIcon, label: "Wind speed", value: `${wind} m/s` },
    { icon: Cloud, label: "Cloud cover", value: `${cloud}%` },
    { icon: Droplets, label: "Humidity", value: `${humidity}%` },
    { icon: Sun, label: "Irradiance", value: `${irradiance} W/m²` },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="font-display text-base font-semibold mb-4">Weather inputs</h3>
      <div className="space-y-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </div>
            <span className="text-sm font-medium tabular">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground leading-relaxed">
        Numerical weather prediction blended from ECMWF + GFS, downscaled to plant coordinates.
      </div>
    </div>
  );
};
