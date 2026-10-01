import type { DashboardFilterState } from '../types';

type DateRange = { start: string; end: string } | null;

type DashboardFiltersViewProps = {
  dateRange: DateRange;
  sports: string[];
  filterState: DashboardFilterState;
  onChange: (state: DashboardFilterState) => void;
};

export function DashboardFiltersView({ dateRange, sports, filterState, onChange }: DashboardFiltersViewProps) {
  const emitChange = (nextStartDate: string, nextEndDate: string, nextSport: string): void => {
    onChange({
      startDate: nextStartDate,
      endDate: nextEndDate,
      sport: nextSport,
      datesReversed: Boolean(nextStartDate && nextEndDate && nextStartDate > nextEndDate),
    });
  };

  return (
    <section className="global-filters" aria-label="Filter dashboard statistics and activities">
      <div className="date-filters date-filters--global">
        <label className="date-filter">
          <span>FROM</span>
          <input
            type="date"
            aria-label="Start date"
            min={dateRange?.start}
            max={dateRange?.end}
            value={filterState.startDate}
            onChange={(event) => {
              const value = event.currentTarget.value;
              emitChange(value, filterState.endDate, filterState.sport);
            }}
          />
        </label>
        <label className="date-filter">
          <span>TO</span>
          <input
            type="date"
            aria-label="End date"
            min={dateRange?.start}
            max={dateRange?.end}
            value={filterState.endDate}
            onChange={(event) => {
              const value = event.currentTarget.value;
              emitChange(filterState.startDate, value, filterState.sport);
            }}
          />
        </label>
      </div>
      <label className="filter-label global-type-filter">
        <span>TYPE</span>
        <select
          aria-label="Filter dashboard by activity type"
          value={filterState.sport}
          onChange={(event) => {
            const value = event.currentTarget.value;
            emitChange(filterState.startDate, filterState.endDate, value);
          }}
        >
          <option value="">All activities</option>
          {[...sports].sort((a, b) => a.localeCompare(b)).map((activitySport) => (
            <option key={activitySport} value={activitySport}>{activitySport}</option>
          ))}
        </select>
      </label>
      <p className="filter-error" hidden={!filterState.datesReversed}>Start date must be on or before end date.</p>
    </section>
  );
}