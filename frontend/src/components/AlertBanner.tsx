interface AlertBannerProps { temperature: number | null; location: string; }
export default function AlertBanner({ temperature, location }: AlertBannerProps) {
  if (temperature === null || temperature < 90) return null;
  const severe = temperature >= 110;
  const extreme = temperature >= 100;
  const label = severe ? "Extreme heat emergency" : extreme ? "Extreme heat alert" : "Heat alert";
  return <div className={`absolute left-0 right-0 top-0 z-50 px-3 py-1 text-center text-xs font-semibold text-white ${severe ? "bg-red-800" : extreme ? "bg-red-600" : "bg-amber-600"}`}>{label} in {location}: {Math.round(temperature)}°F. Seek shade, water, and cooling breaks.</div>;
}
