import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Activity } from '../types';
import { ActivityInsightsView } from './activity-insights-view';

export function createActivityInsights(): { element: HTMLElement; update: (activities: Activity[]) => void } {
  const element = document.createElement('div');
  const root = createRoot(element);
  return {
    element,
    update(activities) {
      root.render(createElement(ActivityInsightsView, { activities }));
    },
  };
}