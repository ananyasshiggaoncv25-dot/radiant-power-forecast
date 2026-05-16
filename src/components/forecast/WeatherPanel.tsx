import { useEffect, useState } from "react";
import { Cloud, Droplets, Thermometer, Wind as WindIcon, Sun, Loader2 } from "lucide-react";
import type { Asset } from "@/lib/forecast-data";
import { useI18n } from "@/lib/i18n";

interface Props {
  asset: Asset;
}

interface LiveWeather {
  temp: number;
  wind: number;
  cloud: number;
  humidity: number;
  irradiance: number;
}

export const WeatherPanel = ({ asset }: Props) => {
  const { t } = useI18n();
  const [data, setData] = useState<LiveWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${asset.lat}&longitude=${asset.lng}&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,shortwave_radiation&wind_speed_unit=ms&timezone=Asia%2FKolkata`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const c = json?.current;
        if (!c) {
          setError(true);
          setLoading(false);
          return;
        }
        setData({
          temp: Math.round(c.temperature_2m),
          wind: Math.round(c.wind_speed_10m * 10) / 10,
          cloud: Math.round(c.cloud_cover),
          humidity: Math.round(c.relative_humidity_2m),
          irradiance: Math.round(c.shortwave_radiation ?? 0),
        });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [asset.id, asset.lat, asset.lng]);

  const items = data
    ? [
        { icon: Thermometer, label: t("weather.temperature"), value: `${data.temp}°C` },
        { icon: WindIcon, label: t("weather.windSpeed"), value: `${data.wind} m/s` },
        { icon: Cloud, label: t("weather.cloudCover"), value: `${data.cloud}%` },
        { icon: Droplets, label: t("weather.humidity"), value: `${data.humidity}%` },
        { icon: Sun, label: t("weather.irradiance"), value: `${data.irradiance} W/m²` },
      ]
    : [];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="font-display text-base font-semibold mb-4">{t("weather.title")}</h3>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Fetching live conditions…</span>
        </div>
      ) : error ? (
        <div className="text-sm text-muted-foreground py-6">Unable to load live weather.</div>
      ) : (
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
      )}
      <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground leading-relaxed">
        {t("weather.footer")}
      </div>
    </div>
  );
};
