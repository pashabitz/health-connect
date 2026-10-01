import type { CSSProperties } from 'react';
import { formatMonth, numberFormat, oneDecimal } from '../format';
import type { Activity } from '../types';

type MonthDatum = { month: string; count: number; distanceMeters: number; distanceCount: number };

type ActivityInsightsViewProps = {
  activities: Activity[];
};

function barHeightStyle(height: number): CSSProperties {
  return { '--bar-height': `${height}%` } as CSSProperties;
}

export function ActivityInsightsView({ activities }: ActivityInsightsViewProps) {
  const sportCounts = new Map<string, number>();
  const monthCounts = new Map<string, MonthDatum>();
  for (const activity of activities) {
    sportCounts.set(activity.sport, (sportCounts.get(activity.sport) ?? 0) + 1);
    const month = activity.date.slice(0, 7);
    const bucket = monthCounts.get(month) ?? { month, count: 0, distanceMeters: 0, distanceCount: 0 };
    bucket.count += 1;
    if (activity.distanceMeters != null) {
      bucket.distanceMeters += activity.distanceMeters;
      bucket.distanceCount += 1;
    }
    monthCounts.set(month, bucket);
  }

  const months = [...monthCounts.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  const maxCount = Math.max(1, ...months.map((month) => month.count));
  const maxDistance = Math.max(1, ...months.map((month) => month.distanceMeters / 1000));

  return (
    <section className="insights" aria-label="Activity breakdown">
      <article className="panel sport-panel">
        <div className="panel-heading">
          <div>SPORTS</div>
          <span className="panel-heading__aside">{sportCounts.size} types</span>
        </div>
        <div className="sport-list">
          {[...sportCounts.entries()].sort((a, b) => b[1] - a[1]).map(([sport, count]) => (
            <div className="sport-row" key={sport}>
              <div className="sport-row__label">
                <span className="sport-row__name">{sport}</span>
                <span className="sport-row__count">{numberFormat.format(count)}</span>
              </div>
              <div className="sport-track">
                <span className="sport-track__fill" style={{ width: `${activities.length ? (count / activities.length) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </article>
      <article className="panel trend-panel">
        <div className="panel-heading">
          <div>MONTHLY RHYTHM</div>
          <div className="chart-legend">
            <span className="chart-legend__item">
              <span className="chart-legend__swatch chart-legend__swatch--count" />
              <span>Activities</span>
            </span>
            <span className="chart-legend__item">
              <span className="chart-legend__swatch chart-legend__swatch--distance" />
              <span>Distance (km)</span>
            </span>
          </div>
        </div>
        <div className="bar-chart" role="list" aria-label={`Monthly activity count and distance for ${months.length} months`}>
          <div className="bar-chart__months">
            {months.map((month) => {
              const distanceKm = month.distanceMeters / 1000;
              const countHeight = month.count ? Math.max(4, (month.count / maxCount) * 100) : 0;
              const distanceHeight = month.distanceCount ? Math.max(14, (distanceKm / maxDistance) * 100) : 14;
              return (
                <div
                  className="bar-chart__column"
                  role="listitem"
                  aria-label={`${formatMonth(month.month)}: ${month.count} activities, ${month.distanceCount ? `${oneDecimal.format(distanceKm)} km` : 'distance unavailable'}`}
                  key={month.month}
                >
                  <div className="bar-chart__track">
                    <div className="bar-chart__series" style={barHeightStyle(countHeight)}>
                      <span className="bar-chart__bar bar-chart__bar--count" style={barHeightStyle(countHeight)} title={`${month.count} activities`} aria-hidden="true" />
                      <span className="bar-chart__value" style={barHeightStyle(countHeight)}>{numberFormat.format(month.count)}</span>
                    </div>
                    <div className="bar-chart__series" style={barHeightStyle(distanceHeight)}>
                      <span className="bar-chart__bar bar-chart__bar--distance" style={barHeightStyle(distanceHeight)} title={month.distanceCount ? `${oneDecimal.format(distanceKm)} km` : 'Distance unavailable'} aria-hidden="true" />
                      <span className="bar-chart__value" style={barHeightStyle(distanceHeight)}>{month.distanceCount ? oneDecimal.format(distanceKm) : '—'}</span>
                    </div>
                  </div>
                  <span className="bar-chart__label">{formatMonth(month.month)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </article>
    </section>
  );
}