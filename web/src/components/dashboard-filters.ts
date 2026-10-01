import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { DashboardFilterState } from '../types';
import { DashboardFiltersView } from './dashboard-filters-view';

type DateRange = { start: string; end: string } | null;

export function createDashboardFilters(
  dateRange: DateRange,
  sports: string[],
  onChange: (state: DashboardFilterState) => void,
): { element: HTMLElement; getState: () => DashboardFilterState } {
  let state: DashboardFilterState = { startDate: '', endDate: '', sport: '', datesReversed: false };
  const element = document.createElement('div');
  const root = createRoot(element);
  root.render(createElement(DashboardFiltersView, {
    dateRange,
    sports,
    onChange(nextState) {
      state = nextState;
      onChange(nextState);
    },
  }));

  return { element, getState: () => state };
}