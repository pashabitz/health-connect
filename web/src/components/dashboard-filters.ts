import type { DashboardFilterState } from '../types';
import { el } from './dom';

type DateRange = { start: string; end: string } | null;

export function createDashboardFilters(
  dateRange: DateRange,
  sports: string[],
  onChange: (state: DashboardFilterState) => void,
): { element: HTMLElement; getState: () => DashboardFilterState } {
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
    if (dateRange) {
      input.min = dateRange.start;
      input.max = dateRange.end;
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
  for (const sport of sports.sort((a, b) => a.localeCompare(b))) {
    const option = el('option', '', sport);
    option.value = sport;
    filter.append(option);
  }
  filterLabel.append(filter);

  const filterError = el('p', 'filter-error', 'Start date must be on or before end date.');
  filterError.hidden = true;
  const element = el('section', 'global-filters');
  element.setAttribute('aria-label', 'Filter dashboard statistics and activities');
  element.append(dateFilters, filterLabel, filterError);

  let state: DashboardFilterState = { startDate: '', endDate: '', sport: '', datesReversed: false };
  const emitChange = (): void => {
    state = {
      startDate: startDate.value,
      endDate: endDate.value,
      sport: filter.value,
      datesReversed: Boolean(startDate.value && endDate.value && startDate.value > endDate.value),
    };
    filterError.hidden = !state.datesReversed;
    onChange(state);
  };
  startDate.addEventListener('input', emitChange);
  endDate.addEventListener('input', emitChange);
  filter.addEventListener('change', emitChange);

  return { element, getState: () => state };
}