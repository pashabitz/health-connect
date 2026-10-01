import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Activity } from '../types';
import { DashboardMetricsView } from './dashboard-metrics-view';

export function createDashboardMetrics(): { element: HTMLElement; update: (activities: Activity[]) => void } {
  const element = document.createElement('div');
  const root = createRoot(element);
  return {
    element,
    update(activities) {
      root.render(createElement(DashboardMetricsView, { activities }));
    },
  };
}