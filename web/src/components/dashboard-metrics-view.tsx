import { formatDistance, formatDuration, formatElevation, numberFormat } from '../format';
import type { Activity } from '../types';

type DashboardMetricsViewProps = {
  activities: Activity[];
};

export function DashboardMetricsView({ activities }: DashboardMetricsViewProps) {
  const totals = activities.reduce((result, activity) => {
    if (activity.distanceMeters != null) {
      result.distanceMeters += activity.distanceMeters;
      result.distanceCount += 1;
    }
    if (activity.movingTimeSeconds != null) {
      result.movingTimeSeconds += activity.movingTimeSeconds;
      result.movingTimeCount += 1;
    }
    if (activity.elevationGainMeters != null) {
      result.elevationGainMeters += activity.elevationGainMeters;
      result.elevationCount += 1;
    }
    return result;
  }, { distanceMeters: 0, distanceCount: 0, movingTimeSeconds: 0, movingTimeCount: 0, elevationGainMeters: 0, elevationCount: 0 });
  const activityCount = activities.length;
  const cards = [
    [numberFormat.format(activityCount), 'Activities in selected dates', 'ACTIVITIES', '↗'],
    [formatDistance(totals.distanceMeters), totals.distanceCount < activityCount ? `${numberFormat.format(totals.distanceCount)} with distance data` : 'Across filtered activities', 'DISTANCE', '⌁'],
    [formatDuration(totals.movingTimeSeconds), totals.movingTimeCount < activityCount ? `${numberFormat.format(totals.movingTimeCount)} with time data` : 'Moving time', 'MOVING TIME', '◷'],
    [formatElevation(totals.elevationGainMeters), totals.elevationCount < activityCount ? `${numberFormat.format(totals.elevationCount)} with elevation data` : 'Total elevation gain', 'ELEVATION', '⌃'],
  ];

  return (
    <section className="metric-grid" aria-label="Activity totals">
      {cards.map(([value, note, label, icon]) => (
        <article className="metric-card" key={label}>
          <div className="metric-card__top">
            <span className="metric-card__label">{label}</span>
            <span className="metric-card__icon">{icon}</span>
          </div>
          <strong className="metric-card__value">{value}</strong>
          <span className="metric-card__note">{note}</span>
        </article>
      ))}
    </section>
  );
}