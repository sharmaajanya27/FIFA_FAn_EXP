export function formatDistance(meters: number): string {
  const feet = meters * 3.28084;
  if (feet < 1000) return `${Math.round(feet)} ft`;
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

export function formatScore(score: number): string {
  return `${Math.round(score * 100)}`;
}

export function formatKickoff(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Google Maps directions URL for a destination point. */
export function directionsUrl(lat: number, lon: number, label?: string): string {
  const q = label ? `${label} @${lat},${lon}` : `${lat},${lon}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lon}`)}&destination_place_id=${encodeURIComponent(q)}`;
}
