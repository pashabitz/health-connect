import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Activity } from '../types';
import { ActivityTableView } from './activity-table-view';

export function createActivityTable(): { element: HTMLElement; update: (activities: Activity[], validDateRange?: boolean) => void } {
  const element = document.createElement('div');
  const root = createRoot(element);
  return {
    element,
    update(activities, rangeIsValid = true) {
      root.render(createElement(ActivityTableView, { activities, validDateRange: rangeIsValid }));
    },
  };
}