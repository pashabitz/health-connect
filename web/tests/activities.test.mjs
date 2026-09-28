import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardData, parseActivitiesCsv } from '../server/activities.mjs';

const headers = Array.from({ length: 103 }, (_, index) => `Column ${index + 1}`);
Object.assign(headers, {
  0: 'Activity ID',
  1: 'Activity Date',
  2: 'Activity Name',
  3: 'Activity Type',
  5: 'Elapsed Time',
  6: 'Distance',
  7: 'Max Heart Rate',
  8: 'Relative Effort',
  9: 'Commute',
  10: 'Activity Private Note',
  11: 'Activity Gear',
  12: 'Filename',
  15: 'Elapsed Time',
  16: 'Moving Time',
  17: 'Distance',
  20: 'Elevation Gain',
  30: 'Max Heart Rate',
  31: 'Average Heart Rate',
  37: 'Relative Effort',
});

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function makeCsv(rows) {
  return [headers, ...rows.map(({ date, name, sport = 'Ride', moving = '3600', distance = '10000', elevation = '100' }) => {
    const row = Array(103).fill('');
    row[1] = date;
    row[2] = name;
    row[3] = sport;
    row[16] = moving;
    row[17] = distance;
    row[20] = elevation;
    row[4] = 'private description must not leave server';
    row[12] = 'recording.fit';
    row[102] = 'private media';
    return row;
  })].map((row) => row.map(csvCell).join(',')).join('\n');
}

test('parses quoted names and duplicate-header schema by position', () => {
  const activities = parseActivitiesCsv(makeCsv([
    { date: '2025-02-03', name: 'Ride, "Early"', distance: '12345.6', moving: '3600', elevation: '' },
  ]));
  assert.deepEqual(activities, [{
    date: '2025-02-03',
    name: 'Ride, "Early"',
    sport: 'Ride',
    movingTimeSeconds: 3600,
    distanceMeters: 12345.6,
    elevationGainMeters: null,
  }]);
  assert.equal(Object.hasOwn(activities[0], 'filename'), false);
  assert.equal(Object.hasOwn(activities[0], 'description'), false);
});

test('normalizes export timestamps to calendar dates for stable sorting and monthly summaries', () => {
  const activities = parseActivitiesCsv(makeCsv([
    { date: 'Sep 26, 2026, 7:45:10 AM', name: 'Latest' },
    { date: 'May 1, 2021, 8:10:00 AM', name: 'Earliest' },
  ]));
  assert.deepEqual(activities.map((activity) => activity.date), ['2026-09-26', '2021-05-01']);
  assert.deepEqual(buildDashboardData(activities).summary.dateRange, { start: '2021-05-01', end: '2026-09-26' });
});

test('rejects invalid dates and unexpected duplicate-header positions', () => {
  assert.throws(() => parseActivitiesCsv(makeCsv([{ date: 'not-a-date', name: 'Test' }])), /Invalid activity date/);
  assert.throws(() => parseActivitiesCsv(makeCsv([{ date: '2025-02-31', name: 'Test' }])), /Invalid activity date/);
  const badSchema = headers.slice();
  badSchema[17] = 'Distance summary';
  assert.throws(() => parseActivitiesCsv([badSchema, Array(103).fill('')].map((row) => row.join(',')).join('\n')), /Unexpected CSV schema/);
});

test('aggregates dashboard fields and returns only allowlisted activity values', () => {
  const result = buildDashboardData(parseActivitiesCsv(makeCsv([
    { date: '2025-02-03', name: 'Morning ride', sport: 'Ride', distance: '12000', moving: '3600', elevation: '75' },
    { date: '2025-01-04', name: 'Evening walk', sport: 'Walk', distance: '', moving: '', elevation: '' },
  ])));
  assert.equal(result.summary.activityCount, 2);
  assert.deepEqual(result.summary.dateRange, { start: '2025-01-04', end: '2025-02-03' });
  assert.equal(result.summary.distanceMeters, 12000);
  assert.equal(result.summary.distanceCount, 1);
  assert.equal(result.summary.movingTimeSeconds, 3600);
  assert.equal(result.summary.movingTimeCount, 1);
  assert.deepEqual(result.sportCounts, { Ride: 1, Walk: 1 });
  assert.deepEqual(result.months.map((month) => month.month), ['2025-01', '2025-02']);
  assert.deepEqual(Object.keys(result.activities[0]).sort(), [
    'date', 'distanceMeters', 'elevationGainMeters', 'movingTimeSeconds', 'name', 'sport',
  ]);
  assert.equal(result.activities[0].name, 'Morning ride');
});
