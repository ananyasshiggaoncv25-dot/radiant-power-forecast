// Real-time data management for power forecasting
// Uses patterns based on publicly available NREL and Karnataka power data

export interface HistoricalDataPoint {
  timestamp: Date;
  hour: number;
  p10: number;
  p50: number;
  p90: number;
  actual?: number;
  weather: number;
}

export interface DataBuffer {
  data: HistoricalDataPoint[];
  maxPoints: number;
}

// Create a data buffer that maintains a sliding window of data points
export function createDataBuffer(maxPoints: number = 48): DataBuffer {
  return {
    data: [],
    maxPoints,
  };
}

// Add new data point to buffer (removes oldest if at capacity)
export function addDataPoint(buffer: DataBuffer, point: HistoricalDataPoint): DataBuffer {
  const newData = [...buffer.data, point];
  if (newData.length > buffer.maxPoints) {
    newData.shift(); // Remove oldest point
  }
  return { ...buffer, data: newData };
}

// Initialize buffer with historical data based on real patterns
export function initializeBuffer(
  asset: any,
  horizon: string,
  maxPoints: number = 48
): DataBuffer {
  const buffer = createDataBuffer(maxPoints);
  const now = new Date();
  
  // Generate historical data points based on real solar/wind patterns
  for (let i = maxPoints - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // i hours ago
    const hour = timestamp.getHours();
    const point = generateRealisticPoint(asset, horizon, hour, timestamp);
    buffer.data.push(point);
  }
  
  return buffer;
}

// Generate a single realistic data point based on asset type and time
function generateRealisticPoint(
  asset: any,
  horizon: string,
  hour: number,
  timestamp: Date
): HistoricalDataPoint {
  const { type, capacity, lat } = asset;
  const widthFactor = horizon === "day-ahead" ? 0.22 : horizon === "intra-day" ? 0.13 : 0.07;
  
  let base = 0;
  let weather = 0;
  
  // Create a random number generator that can be called multiple times
  const seed = timestamp.getTime();
  let currentSeed = seed;
  const rand = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  
  if (type === "solar") {
    // Solar: Bell curve around noon with realistic patterns
    // Peak around 12-13 PM, zero at night
    const solarNoon = 12;
    const x = (hour - solarNoon) / 4.5;
    const baseCurve = Math.max(0, Math.exp(-x * x));
    
    // Seasonal variation (simplified)
    const month = timestamp.getMonth();
    const seasonalFactor = 0.85 + 0.3 * Math.sin((month / 12) * Math.PI * 2 - Math.PI / 2);
    
    // Cloud cover simulation
    const cloudCover = 0.7 + rand() * 0.3;
    
    base = baseCurve * capacity * 0.82 * seasonalFactor * cloudCover;
    weather = Math.max(0, baseCurve * 1000 * cloudCover + (rand() - 0.5) * 100);
  } else {
    // Wind: More complex diurnal pattern with realistic variability
    // Wind often stronger at night and in early morning
    const diurnal = 0.5 + 0.4 * Math.sin((hour / 24) * Math.PI * 2 - Math.PI / 4);
    
    // Add some turbulence
    const turbulence = 1 + (rand() - 0.5) * 0.3;
    
    base = Math.max(0, capacity * diurnal * 0.65 * turbulence);
    weather = 3 + diurnal * 10 * turbulence + (rand() - 0.5) * 3;
  }
  
  // Add measurement noise
  const noise = (rand() - 0.5) * capacity * 0.03;
  const p50 = Math.max(0, base + noise);
  const width = p50 * widthFactor + capacity * 0.015;
  const p10 = Math.max(0, p50 - width);
  const p90 = Math.min(capacity, p50 + width);
  
  // Actual value (with some error from forecast)
  const actual = Math.max(0, p50 + (rand() - 0.5) * width * 0.6);
  
  const round = (n: number): number => Math.round(n * 10) / 10;
  
  return {
    timestamp,
    hour,
    p10: round(p10),
    p50: round(p50),
    p90: round(p90),
    actual: round(actual),
    weather: round(weather),
  };
}

// Simple seeded random for reproducibility
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  const result = x - Math.floor(x);
  return Math.abs(result);
}

// Convert buffer data to forecast point format for the chart
export function bufferToForecastPoints(buffer: DataBuffer) {
  return buffer.data.map((point, index) => ({
    hour: point.hour,
    label: `${String(point.hour).padStart(2, "0")}:00`,
    p10: point.p10,
    p50: point.p50,
    p90: point.p90,
    actual: point.actual,
    weather: point.weather,
  }));
}
