import { formatDate, formatDistance, formatDuration, formatElevation, numberFormat } from '../format';
import type { Activity } from '../types';
import { el } from './dom';

export function createActivityTable(): { element: HTMLElement; update: (activities: Activity[], validDateRange?: boolean) => void } {
  const activityPanel = el('section', 'panel activities-panel');
  const activitiesHeading = el('div', 'activities-heading');
  const headingCopy = el('div');
  headingCopy.append(el('p', 'eyebrow', 'THE FULL PICTURE'), el('h2', '', 'Your activities'));
  const activityTotal = el('span', 'activity-total');
  activitiesHeading.append(headingCopy, activityTotal);

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

  let currentActivities: Activity[] = [];
  let validDateRange = true;
  const renderRows = (): void => {
    const query = search.value.trim().toLocaleLowerCase();
    const visible = currentActivities.filter((activity) =>
      !query || activity.name.toLocaleLowerCase().includes(query) || activity.sport.toLocaleLowerCase().includes(query),
    );
    tbody.replaceChildren();
    for (const activity of visible) {
      const row = el('tr');
      const titleCell = el('td', 'activity-title-cell');
      titleCell.append(el('span', 'activity-title-cell__name', activity.name), el('span', 'activity-title-cell__date', formatDate(activity.date)));
      row.append(titleCell, el('td', 'sport-cell', activity.sport), el('td', 'numeric-cell', formatDistance(activity.distanceMeters)), el('td', 'numeric-cell', formatDuration(activity.movingTimeSeconds)), el('td', 'numeric-cell', formatElevation(activity.elevationGainMeters)));
      tbody.append(row);
    }
    empty.hidden = visible.length !== 0 || !validDateRange;
    tableWrap.hidden = visible.length === 0 || !validDateRange;
    activityTotal.textContent = `${numberFormat.format(visible.length)} of ${numberFormat.format(currentActivities.length)} activities`;
  };
  search.addEventListener('input', renderRows);

  return {
    element: activityPanel,
    update(activities, rangeIsValid = true) {
      currentActivities = activities;
      validDateRange = rangeIsValid;
      renderRows();
    },
  };
}