import { useState } from 'react';
import type { DashboardFilterState } from '../types';

type DateRange = { start: string; end: string } | null;

type DashboardFiltersViewProps = {
  dateRange: DateRange;
  sports: string[];
  onChange: (state: DashboardFilterState) => void;
};

export function DashboardFiltersView({ dateRange, sports, onChange }: DashboardFiltersViewProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sport, setSport] = useState('');
  const datesReversed = Boolean(startDate && endDate && startDate > endDate);

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
            value={startDate}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setStartDate(value);
              emitChange(value, endDate, sport);
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
            value={endDate}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setEndDate(value);
              emitChange(startDate, value, sport);
            }}
          />
        </label>
      </div>
      <label className="filter-label global-type-filter">
        <span>TYPE</span>
        <select
          aria-label="Filter dashboard by activity type"
          value={sport}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setSport(value);
            emitChange(startDate, endDate, value);
          }}
        >
          <option value="">All activities</option>
          {[...sports].sort((a, b) => a.localeCompare(b)).map((activitySport) => (
            <option key={activitySport} value={activitySport}>{activitySport}</option>
          ))}
        </select>
      </label>
      <p className="filter-error" hidden={!datesReversed}>Start date must be on or before end date.</p>
    </section>
  );
}