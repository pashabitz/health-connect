import { useState } from 'react';
import { formatDate, formatDistance, formatDuration, formatElevation, numberFormat } from '../format';
import type { Activity } from '../types';

type ActivityTableViewProps = {
  activities: Activity[];
  validDateRange: boolean;
};

export function ActivityTableView({ activities, validDateRange }: ActivityTableViewProps) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleActivities = activities.filter((activity) =>
    !normalizedQuery
    || activity.name.toLocaleLowerCase().includes(normalizedQuery)
    || activity.sport.toLocaleLowerCase().includes(normalizedQuery),
  );

  return (
    <section className="panel activities-panel">
      <div className="activities-heading">
        <div>
          <p className="eyebrow">THE FULL PICTURE</p>
          <h2>Your activities</h2>
        </div>
        <span className="activity-total">
          {numberFormat.format(visibleActivities.length)} of {numberFormat.format(activities.length)} activities
        </span>
      </div>
      <div className="table-controls">
        <label className="search-box">
          <span className="search-box__icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search activities"
            aria-label="Search activity names"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
      </div>
      <div className="table-wrap" hidden={visibleActivities.length === 0 || !validDateRange}>
        <table>
          <thead>
            <tr>
              {['Activity', 'Type', 'Distance', 'Moving time', 'Elevation'].map((label) => (
                <th key={label} className={label === 'Activity' ? undefined : 'numeric-heading'}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleActivities.map((activity, index) => (
              <tr key={`${activity.date}-${activity.name}-${index}`}>
                <td className="activity-title-cell">
                  <span className="activity-title-cell__name">{activity.name}</span>
                  <span className="activity-title-cell__date">{formatDate(activity.date)}</span>
                </td>
                <td className="sport-cell">{activity.sport}</td>
                <td className="numeric-cell">{formatDistance(activity.distanceMeters)}</td>
                <td className="numeric-cell">{formatDuration(activity.movingTimeSeconds)}</td>
                <td className="numeric-cell">{formatElevation(activity.elevationGainMeters)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="empty-state" hidden={visibleActivities.length !== 0 || !validDateRange}>
        No activities match your search.
      </p>
    </section>
  );
}