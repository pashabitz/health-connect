import { formatMonth, numberFormat, oneDecimal } from '../format';
import type { Activity } from '../types';
import { el } from './dom';

type MonthDatum = { month: string; count: number; distanceMeters: number; distanceCount: number };

function renderMonthChart(chart: HTMLElement, values: MonthDatum[]): void {
  const months = [...values].sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  const maxCount = Math.max(1, ...months.map((month) => month.count));
  const maxDistance = Math.max(1, ...months.map((month) => month.distanceMeters / 1000));
  chart.setAttribute('aria-label', `Monthly activity count and distance for ${months.length} months`);
  chart.replaceChildren();

  const monthColumns = el('div', 'bar-chart__months');
  for (const month of months) {
    const column = el('div', 'bar-chart__column');
    column.setAttribute('role', 'listitem');
    const distanceKm = month.distanceMeters / 1000;
    column.setAttribute('aria-label', `${formatMonth(month.month)}: ${month.count} activities, ${month.distanceCount ? `${oneDecimal.format(distanceKm)} km` : 'distance unavailable'}`);
    const barTrack = el('div', 'bar-chart__track');
    const countSeries = el('div', 'bar-chart__series');
    const countHeight = month.count ? Math.max(4, (month.count / maxCount) * 100) : 0;
    countSeries.style.setProperty('--bar-height', `${countHeight}%`);
    const countBar = el('span', 'bar-chart__bar bar-chart__bar--count');
    countBar.style.setProperty('--bar-height', `${countHeight}%`);
    countBar.title = `${month.count} activities`;
    countBar.setAttribute('aria-hidden', 'true');
    countSeries.append(countBar, el('span', 'bar-chart__value', numberFormat.format(month.count)));
    const distanceSeries = el('div', 'bar-chart__series');
    const distanceHeight = month.distanceCount ? Math.max(14, (distanceKm / maxDistance) * 100) : 14;
    distanceSeries.style.setProperty('--bar-height', `${distanceHeight}%`);
    const distanceBar = el('span', 'bar-chart__bar bar-chart__bar--distance');
    distanceBar.style.setProperty('--bar-height', `${distanceHeight}%`);
    distanceBar.title = month.distanceCount ? `${oneDecimal.format(distanceKm)} km` : 'Distance unavailable';
    distanceBar.setAttribute('aria-hidden', 'true');
    distanceSeries.append(distanceBar, el('span', 'bar-chart__value', month.distanceCount ? oneDecimal.format(distanceKm) : '—'));
    barTrack.append(countSeries, distanceSeries);
    column.append(barTrack, el('span', 'bar-chart__label', formatMonth(month.month)));
    monthColumns.append(column);
  }
  chart.append(monthColumns);
}

export function createActivityInsights(): { element: HTMLElement; update: (activities: Activity[]) => void } {
  const element = el('section', 'insights');
  element.setAttribute('aria-label', 'Activity breakdown');

  const sportPanel = el('article', 'panel sport-panel');
  const sportTitle = el('div', 'panel-heading');
  const sportAside = el('span', 'panel-heading__aside');
  sportTitle.append(el('div', '', 'SPORTS'), sportAside);
  const sportList = el('div', 'sport-list');
  sportPanel.append(sportTitle, sportList);

  const trendPanel = el('article', 'panel trend-panel');
  const trendHeading = el('div', 'panel-heading');
  trendHeading.append(el('div', '', 'MONTHLY RHYTHM'));
  const chartLegend = el('div', 'chart-legend');
  const countLegend = el('span', 'chart-legend__item');
  countLegend.append(el('span', 'chart-legend__swatch chart-legend__swatch--count'), el('span', '', 'Activities'));
  const distanceLegend = el('span', 'chart-legend__item');
  distanceLegend.append(el('span', 'chart-legend__swatch chart-legend__swatch--distance'), el('span', '', 'Distance (km)'));
  chartLegend.append(countLegend, distanceLegend);
  trendHeading.append(chartLegend);
  const chart = el('div', 'bar-chart');
  chart.setAttribute('role', 'list');
  trendPanel.append(trendHeading, chart);
  element.append(sportPanel, trendPanel);

  return {
    element,
    update(activities) {
      const sportCounts = new Map<string, number>();
      const months = new Map<string, MonthDatum>();
      for (const activity of activities) {
        sportCounts.set(activity.sport, (sportCounts.get(activity.sport) ?? 0) + 1);
        const month = activity.date.slice(0, 7);
        const bucket = months.get(month) ?? { month, count: 0, distanceMeters: 0, distanceCount: 0 };
        bucket.count += 1;
        if (activity.distanceMeters != null) {
          bucket.distanceMeters += activity.distanceMeters;
          bucket.distanceCount += 1;
        }
        months.set(month, bucket);
      }
      sportAside.textContent = `${sportCounts.size} types`;
      sportList.replaceChildren();
      for (const [sport, count] of [...sportCounts.entries()].sort((a, b) => b[1] - a[1])) {
        const row = el('div', 'sport-row');
        const label = el('div', 'sport-row__label');
        label.append(el('span', 'sport-row__name', sport), el('span', 'sport-row__count', numberFormat.format(count)));
        const track = el('div', 'sport-track');
        const bar = el('span', 'sport-track__fill');
        bar.style.width = `${activities.length ? (count / activities.length) * 100 : 0}%`;
        track.append(bar);
        row.append(label, track);
        sportList.append(row);
      }
      renderMonthChart(chart, [...months.values()]);
    },
  };
}