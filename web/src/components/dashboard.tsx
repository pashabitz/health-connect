import { useMemo, useState } from 'react';
import { formatDate } from '../format';
import type { Activity, Dashboard, DashboardFilterState } from '../types';
import { ActivityInsightsView } from './activity-insights-view';
import { ActivityTableView } from './activity-table-view';
import { DashboardFiltersView } from './dashboard-filters-view';
import { DashboardMetricsView } from './dashboard-metrics-view';

type DashboardProps = {
  data: Dashboard;
  onSignOut: () => void | Promise<void>;
};

const initialFilterState: DashboardFilterState = {
  startDate: '',
  endDate: '',
  sport: '',
  datesReversed: false,
};

function filterDates(activities: Activity[], filters: DashboardFilterState): Activity[] {
  return activities.filter((activity) =>
    (!filters.startDate || activity.date >= filters.startDate)
    && (!filters.endDate || activity.date <= filters.endDate),
  );
}

function filterSport(activities: Activity[], sport: string): Activity[] {
  return activities.filter((activity) => !sport || activity.sport === sport);
}

export function Dashboard({ data, onSignOut }: DashboardProps) {
  const [filterState, setFilterState] = useState(initialFilterState);
  const [lastValidFilterState, setLastValidFilterState] = useState(initialFilterState);
  const aggregationFilters = filterState.datesReversed ? lastValidFilterState : filterState;

  const aggregateDateFiltered = useMemo(
    () => filterDates(data.activities, aggregationFilters),
    [data.activities, aggregationFilters.startDate, aggregationFilters.endDate],
  );
  const aggregateActivities = useMemo(
    () => filterSport(aggregateDateFiltered, aggregationFilters.sport),
    [aggregateDateFiltered, aggregationFilters.sport],
  );
  const tableDateFiltered = useMemo(
    () => filterDates(data.activities, filterState),
    [data.activities, filterState.startDate, filterState.endDate],
  );
  const tableActivities = useMemo(
    () => filterSport(tableDateFiltered, filterState.sport),
    [tableDateFiltered, filterState.sport],
  );
  const filteredDates = useMemo(
    () => aggregateDateFiltered.map((activity) => activity.date).sort(),
    [aggregateDateFiltered],
  );
  const shownStart = aggregationFilters.startDate || filteredDates[0];
  const shownEnd = aggregationFilters.endDate || filteredDates.at(-1);
  const rangeText = shownStart && shownEnd
    ? `${formatDate(shownStart)} — ${formatDate(shownEnd)}`
    : 'No activities in selected dates';

  const handleFilterChange = (nextState: DashboardFilterState): void => {
    setFilterState(nextState);
    if (!nextState.datesReversed) setLastValidFilterState(nextState);
  };

  return (
    <main className="shell">
      <header className="masthead">
        <a className="brand" href="#top" aria-label="Activity Ledger home">
          <span className="brand__mark">A</span>
          <span className="brand__name">ACTIVITY LEDGER</span>
        </a>
        <nav className="account-nav" aria-label="Account">
          <a href="/upload">Import export</a>
          <button className="sign-out" type="button" onClick={onSignOut}>Sign out</button>
        </nav>
      </header>
      <section className="intro" id="top">
        <div className="date-range">
          <span className="date-range__dot" />
          <span>{rangeText}</span>
        </div>
      </section>
      <DashboardFiltersView
        dateRange={data.summary.dateRange}
        sports={Object.keys(data.sportCounts)}
        filterState={filterState}
        onChange={handleFilterChange}
      />
      <DashboardMetricsView activities={aggregateActivities} />
      <ActivityInsightsView activities={aggregateActivities} />
      <ActivityTableView activities={tableActivities} validDateRange={!filterState.datesReversed} />
      <footer className="footer">
        <span>Made for the miles, the climbs, and everything between.</span>
        <span className="footer__source">YOUR DATA · PRIVATE BY DEFAULT</span>
      </footer>
    </main>
  );
}