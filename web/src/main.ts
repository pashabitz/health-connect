import './style.css';

type Activity = {
  date: string;
  name: string;
  sport: string;
  movingTimeSeconds: number | null;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
};

type Dashboard = {
  summary: {
    activityCount: number;
    dateRange: { start: string; end: string } | null;
    distanceMeters: number;
    distanceCount: number;
    movingTimeSeconds: number;
    movingTimeCount: number;
    elevationGainMeters: number;
    elevationCount: number;
  };
  sportCounts: Record<string, number>;
  months: Array<{ month: string; count: number; distanceMeters: number; distanceCount: number }>;
  activities: Activity[];
};

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root is missing');
const appRoot: HTMLDivElement = app;

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}

function formatDistance(meters: number | null): string {
  return meters == null ? '—' : `${oneDecimal.format(meters / 1000)} km`;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

function formatElevation(meters: number | null): string {
  return meters == null ? '—' : `${numberFormat.format(meters)} m`;
}

function formatMonth(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' }).format(new Date(`${value}-15T12:00:00`));
}

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

function card(label: string, value: string, note: string, icon: string): HTMLElement {
  const article = el('article', 'metric-card');
  const top = el('div', 'metric-card__top');
  top.append(el('span', 'metric-card__label', label), el('span', 'metric-card__icon', icon));
  article.append(top, el('strong', 'metric-card__value', value), el('span', 'metric-card__note', note));
  return article;
}

function render(data: Dashboard): void {
  appRoot.replaceChildren();
  const shell = el('main', 'shell');
  const header = el('header', 'masthead');
  const brand = el('a', 'brand');
  brand.href = '#top';
  brand.setAttribute('aria-label', 'Activity Ledger home');
  brand.append(el('span', 'brand__mark', 'A'), el('span', 'brand__name', 'ACTIVITY LEDGER'));
  const localBadge = el('span', 'local-badge', 'LOCAL VIEW');
  header.append(brand, localBadge);

  const intro = el('section', 'intro');
  intro.id = 'top';
  const rangeText = data.summary.dateRange
    ? `${formatDate(data.summary.dateRange.start)} — ${formatDate(data.summary.dateRange.end)}`
    : 'No activity dates yet';
  const range = el('div', 'date-range');
  range.append(el('span', 'date-range__dot'), el('span', '', rangeText));
  intro.append(range);

  const dateFilters = el('div', 'date-filters date-filters--global');
  const startDateLabel = el('label', 'date-filter');
  startDateLabel.append(el('span', '', 'FROM'));
  const startDate = el('input');
  startDate.type = 'date';
  startDate.setAttribute('aria-label', 'Start date');
  const endDateLabel = el('label', 'date-filter');
  endDateLabel.append(el('span', '', 'TO'));
  const endDate = el('input');
  endDate.type = 'date';
  endDate.setAttribute('aria-label', 'End date');
  for (const input of [startDate, endDate]) {
    if (data.summary.dateRange) {
      input.min = data.summary.dateRange.start;
      input.max = data.summary.dateRange.end;
    }
  }
  startDateLabel.append(startDate);
  endDateLabel.append(endDate);
  dateFilters.append(startDateLabel, endDateLabel);
  const filterLabel = el('label', 'filter-label global-type-filter');
  filterLabel.append(el('span', '', 'TYPE'));
  const filter = el('select');
  filter.setAttribute('aria-label', 'Filter dashboard by activity type');
  const allOption = el('option', '', 'All activities');
  allOption.value = '';
  filter.append(allOption);
  for (const sport of Object.keys(data.sportCounts).sort((a, b) => a.localeCompare(b))) {
    const option = el('option', '', sport);
    option.value = sport;
    filter.append(option);
  }
  filterLabel.append(filter);
  const filterError = el('p', 'filter-error', 'Start date must be on or before end date.');
  filterError.hidden = true;
  const globalFilters = el('section', 'global-filters');
  globalFilters.setAttribute('aria-label', 'Filter dashboard statistics and activities');
  globalFilters.append(dateFilters, filterLabel, filterError);

  const metricGrid = el('section', 'metric-grid');
  metricGrid.setAttribute('aria-label', 'Activity totals');
  const elevationNote = data.summary.elevationCount < data.summary.activityCount
    ? `${numberFormat.format(data.summary.elevationCount)} with elevation data`
    : 'Total elevation gain';
  const distanceNote = data.summary.distanceCount < data.summary.activityCount
    ? `${numberFormat.format(data.summary.distanceCount)} with distance data`
    : 'Across all activities';
  const timeNote = data.summary.movingTimeCount < data.summary.activityCount
    ? `${numberFormat.format(data.summary.movingTimeCount)} with time data`
    : 'Moving time';
  metricGrid.append(
    card('ACTIVITIES', numberFormat.format(data.summary.activityCount), 'All recorded efforts', '↗'),
    card('DISTANCE', formatDistance(data.summary.distanceMeters), distanceNote, '⌁'),
    card('MOVING TIME', formatDuration(data.summary.movingTimeSeconds), timeNote, '◷'),
    card('ELEVATION', formatElevation(data.summary.elevationGainMeters), elevationNote, '⌃'),
  );

  const insights = el('section', 'insights');
  insights.setAttribute('aria-label', 'Activity breakdown');
  const sportPanel = el('article', 'panel sport-panel');
  const sportTitle = el('div', 'panel-heading');
  sportTitle.append(el('div', '', 'SPORTS'), el('span', 'panel-heading__aside', `${Object.keys(data.sportCounts).length} types`));
  sportPanel.append(sportTitle);
  const sportList = el('div', 'sport-list');
  const sports = Object.entries(data.sportCounts).sort((a, b) => b[1] - a[1]);
  for (const [sport, count] of sports) {
    const row = el('div', 'sport-row');
    const label = el('div', 'sport-row__label');
    label.append(el('span', 'sport-row__name', sport), el('span', 'sport-row__count', numberFormat.format(count)));
    const track = el('div', 'sport-track');
    const bar = el('span', 'sport-track__fill');
    bar.style.width = `${data.summary.activityCount ? (count / data.summary.activityCount) * 100 : 0}%`;
    track.append(bar);
    row.append(label, track);
    sportList.append(row);
  }
  sportPanel.append(sportList);

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
  trendPanel.append(trendHeading);
  const chart = el('div', 'bar-chart');
  chart.setAttribute('role', 'list');
  renderMonthChart(chart, data.months);
  trendPanel.append(chart);
  insights.append(sportPanel, trendPanel);

  const activityPanel = el('section', 'panel activities-panel');
  const activitiesHeading = el('div', 'activities-heading');
  const headingCopy = el('div');
  headingCopy.append(el('p', 'eyebrow', 'THE FULL PICTURE'), el('h2', '', 'Your activities'));
  activitiesHeading.append(headingCopy, el('span', 'activity-total', `${numberFormat.format(data.activities.length)} activities`));

  const controls = el('div', 'table-controls');
  const searchLabel = el('label', 'search-box');
  const searchIcon = el('span', 'search-box__icon', '⌕');
  searchIcon.setAttribute('aria-hidden', 'true');
  const search = el('input');
  search.type = 'search';
  search.placeholder = 'Search activities';
  search.setAttribute('aria-label', 'Search activity names');
  searchLabel.append(searchIcon, search);
  controls.append(searchLabel);

  const tableWrap = el('div', 'table-wrap');
  const table = el('table');
  const thead = el('thead');
  const headerRow = el('tr');
  for (const label of ['Activity', 'Type', 'Distance', 'Moving time', 'Elevation']) {
    const th = el('th', '', label);
    if (label !== 'Activity') th.classList.add('numeric-heading');
    headerRow.append(th);
  }
  thead.append(headerRow);
  const tbody = el('tbody');
  table.append(thead, tbody);
  tableWrap.append(table);
  const empty = el('p', 'empty-state', 'No activities match your search.');
  empty.hidden = true;
  activityPanel.append(activitiesHeading, controls, tableWrap, empty);

  const footer = el('footer', 'footer');
  footer.append(el('span', '', 'Made for the miles, the climbs, and everything between.'), el('span', 'footer__source', 'LOCAL DATA · PRIVATE BY DEFAULT'));
  shell.append(header, intro, globalFilters, metricGrid, insights, activityPanel, footer);
  appRoot.append(shell);

  const updateAggregates = (activities: Activity[], rangeActivities: Activity[]): void => {
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
    const metricValues = metricGrid.querySelectorAll<HTMLElement>('.metric-card__value');
    const metricNotes = metricGrid.querySelectorAll<HTMLElement>('.metric-card__note');
    const metrics = [
      [numberFormat.format(count), 'Activities in selected dates'],
      [formatDistance(totals.distanceMeters), totals.distanceCount < count ? `${numberFormat.format(totals.distanceCount)} with distance data` : 'Across filtered activities'],
      [formatDuration(totals.movingTimeSeconds), totals.movingTimeCount < count ? `${numberFormat.format(totals.movingTimeCount)} with time data` : 'Moving time'],
      [formatElevation(totals.elevationGainMeters), totals.elevationCount < count ? `${numberFormat.format(totals.elevationCount)} with elevation data` : 'Total elevation gain'],
    ];
    metrics.forEach(([value, note], index) => {
      if (metricValues[index]) metricValues[index].textContent = value;
      if (metricNotes[index]) metricNotes[index].textContent = note;
    });

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
    const sportAside = sportTitle.querySelector<HTMLElement>('.panel-heading__aside');
    if (sportAside) sportAside.textContent = `${sportCounts.size} types`;
    sportList.replaceChildren();
    for (const [sport, sportCount] of [...sportCounts.entries()].sort((a, b) => b[1] - a[1])) {
      const row = el('div', 'sport-row');
      const label = el('div', 'sport-row__label');
      label.append(el('span', 'sport-row__name', sport), el('span', 'sport-row__count', numberFormat.format(sportCount)));
      const track = el('div', 'sport-track');
      const bar = el('span', 'sport-track__fill');
      bar.style.width = `${count ? (sportCount / count) * 100 : 0}%`;
      track.append(bar);
      row.append(label, track);
      sportList.append(row);
    }

    renderMonthChart(chart, [...months.values()]);

    const filteredDates = rangeActivities.map((activity) => activity.date).sort();
    const shownStart = startDate.value || filteredDates[0];
    const shownEnd = endDate.value || filteredDates.at(-1);
    range.lastElementChild!.textContent = shownStart && shownEnd
      ? `${formatDate(shownStart)} — ${formatDate(shownEnd)}`
      : 'No activities in selected dates';
  };

  const updateRows = (): void => {
    const query = search.value.trim().toLocaleLowerCase();
    const selectedSport = filter.value;
    const start = startDate.value;
    const end = endDate.value;
    const datesReversed = Boolean(start && end && start > end);
    filterError.hidden = !datesReversed;
    const dateFiltered = data.activities.filter((activity) =>
      (!start || activity.date >= start)
      && (!end || activity.date <= end),
    );
    const globallyFiltered = dateFiltered.filter((activity) =>
      (!selectedSport || activity.sport === selectedSport),
    );
    const visible = globallyFiltered.filter((activity) =>
      !query || activity.name.toLocaleLowerCase().includes(query) || activity.sport.toLocaleLowerCase().includes(query),
    );
    if (!datesReversed) updateAggregates(globallyFiltered, dateFiltered);
    tbody.replaceChildren();
    for (const activity of visible) {
      const row = el('tr');
      const titleCell = el('td', 'activity-title-cell');
      titleCell.append(el('span', 'activity-title-cell__name', activity.name), el('span', 'activity-title-cell__date', formatDate(activity.date)));
      row.append(titleCell, el('td', 'sport-cell', activity.sport), el('td', 'numeric-cell', formatDistance(activity.distanceMeters)), el('td', 'numeric-cell', formatDuration(activity.movingTimeSeconds)), el('td', 'numeric-cell', formatElevation(activity.elevationGainMeters)));
      tbody.append(row);
    }
    empty.hidden = visible.length !== 0 || datesReversed;
    tableWrap.hidden = visible.length === 0 || datesReversed;
    const total = activityPanel.querySelector<HTMLElement>('.activity-total');
    if (total) total.textContent = `${numberFormat.format(visible.length)} of ${numberFormat.format(globallyFiltered.length)} activities`;
  };
  search.addEventListener('input', updateRows);
  filter.addEventListener('change', updateRows);
  startDate.addEventListener('input', updateRows);
  endDate.addEventListener('input', updateRows);
  updateRows();
}

function renderError(): void {
  appRoot.replaceChildren();
  const main = el('main', 'error-shell');
  const mark = el('span', 'brand__mark', '!');
  const heading = el('h1', '', 'Could not load your activities');
  const copy = el('p', '', 'Check that the local export is available, then restart the app. Your original CSV is read directly and is never served as a download.');
  main.append(mark, heading, copy);
  appRoot.append(main);
}

async function start(): Promise<void> {
  const loading = el('p', 'loading-state', 'Loading your activities…');
  loading.setAttribute('role', 'status');
  appRoot.replaceChildren(loading);
  try {
    const response = await fetch('/api/activities', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    render(await response.json() as Dashboard);
  } catch (error) {
    console.error(error);
    renderError();
  }
}

void start();
