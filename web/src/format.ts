export const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
export const oneDecimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}

export function formatDistance(meters: number | null): string {
  return meters == null ? '—' : `${oneDecimal.format(meters / 1000)} km`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export function formatElevation(meters: number | null): string {
  return meters == null ? '—' : `${numberFormat.format(meters)} m`;
}

export function formatMonth(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' }).format(new Date(`${value}-15T12:00:00`));
}