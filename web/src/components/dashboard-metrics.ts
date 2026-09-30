import { formatDistance, formatDuration, formatElevation, numberFormat } from '../format';
import type { Activity } from '../types';
import { el } from './dom';

function card(label: string, value: string, note: string, icon: string): HTMLElement {
  const article = el('article', 'metric-card');
  const top = el('div', 'metric-card__top');
  top.append(el('span', 'metric-card__label', label), el('span', 'metric-card__icon', icon));
  article.append(top, el('strong', 'metric-card__value', value), el('span', 'metric-card__note', note));
  return article;
}

export function createDashboardMetrics(): { element: HTMLElement; update: (activities: Activity[]) => void } {
  const element = el('section', 'metric-grid');
  element.setAttribute('aria-label', 'Activity totals');
  const cards = [
    card('ACTIVITIES', '0', 'All recorded efforts', '↗'),
    card('DISTANCE', '0 km', 'Across all activities', '⌁'),
    card('MOVING TIME', '0 min', 'Moving time', '◷'),
    card('ELEVATION', '0 m', 'Total elevation gain', '⌃'),
  ];
  element.append(...cards);

  return {
    element,
    update(activities) {
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
      const count = activities.length;
      const values = [
        [numberFormat.format(count), 'Activities in selected dates'],
        [formatDistance(totals.distanceMeters), totals.distanceCount < count ? `${numberFormat.format(totals.distanceCount)} with distance data` : 'Across filtered activities'],
        [formatDuration(totals.movingTimeSeconds), totals.movingTimeCount < count ? `${numberFormat.format(totals.movingTimeCount)} with time data` : 'Moving time'],
        [formatElevation(totals.elevationGainMeters), totals.elevationCount < count ? `${numberFormat.format(totals.elevationCount)} with elevation data` : 'Total elevation gain'],
      ];
      cards.forEach((metricCard, index) => {
        const value = metricCard.querySelector<HTMLElement>('.metric-card__value');
        const note = metricCard.querySelector<HTMLElement>('.metric-card__note');
        if (value) value.textContent = values[index]?.[0] ?? '';
        if (note) note.textContent = values[index]?.[1] ?? '';
      });
    },
  };
}