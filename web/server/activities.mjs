import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';

const DATA_FILE = fileURLToPath(new URL('../../export_3494176/activities.csv', import.meta.url));
const EXPECTED_COLUMNS = Object.freeze({
  date: [1, 'Activity Date'],
  name: [2, 'Activity Name'],
  sport: [3, 'Activity Type'],
  movingTime: [16, 'Moving Time'],
  distance: [17, 'Distance'],
  elevation: [20, 'Elevation Gain'],
});

function parseOptionalNumber(value) {
  if (value == null || String(value).trim() === '') return null;
  const parsed = Number(String(value).replaceAll(',', '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value, rowNumber) {
  const text = String(value ?? '').trim();
  const parsed = new Date(text);
  if (!text || Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid activity date on CSV row ${rowNumber}.`);
  }
  const monthDayYear = text.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})(?:,|$)/);
  if (monthDayYear) {
    const [, monthName, dayText, yearText] = monthDayYear;
    const month = new Date(`${monthName} 1, ${yearText}`).getMonth();
    const year = Number(yearText);
    const day = Number(dayText);
    const validated = new Date(Date.UTC(year, month, day));
    if (validated.getUTCFullYear() !== year || validated.getUTCMonth() !== month || validated.getUTCDate() !== day) {
      throw new Error(`Invalid activity date on CSV row ${rowNumber}.`);
    }
    return `${yearText}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const [, yearText, monthText, dayText] = isoDate;
    const year = Number(yearText);
    const month = Number(monthText) - 1;
    const day = Number(dayText);
    const validated = new Date(Date.UTC(year, month, day));
    if (validated.getUTCFullYear() !== year || validated.getUTCMonth() !== month || validated.getUTCDate() !== day) {
      throw new Error(`Invalid activity date on CSV row ${rowNumber}.`);
    }
    return text;
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseActivitiesCsv(csvText) {
  const parsed = Papa.parse(csvText, { skipEmptyLines: 'greedy' });
  if (parsed.errors.length > 0) {
    throw new Error(`Could not parse activities CSV: ${parsed.errors[0].message}`);
  }

  const [header = [], ...rows] = parsed.data;
  for (const [field, [index, expected]] of Object.entries(EXPECTED_COLUMNS)) {
    if (header[index] !== expected) {
      throw new Error(`Unexpected CSV schema for ${field} at column ${index + 1}.`);
    }
  }

  return rows.map((row, index) => {
    const rowNumber = index + 2;
    const date = parseDate(row[1], rowNumber);
    const name = String(row[2] ?? '').trim();
    const sport = String(row[3] ?? '').trim();
    if (!name || !sport) throw new Error(`Missing activity name or type on CSV row ${rowNumber}.`);

    return {
      date,
      name,
      sport,
      movingTimeSeconds: parseOptionalNumber(row[16]),
      distanceMeters: parseOptionalNumber(row[17]),
      elevationGainMeters: parseOptionalNumber(row[20]),
    };
  });
}

export function buildDashboardData(activities) {
  const dates = activities.map((activity) => activity.date).sort();
  const totals = activities.reduce((result, activity) => {
    if (activity.distanceMeters != null) {
      result.distanceMeters += activity.distanceMeters;
      result.distanceCount += 1;
    }
    if (activity.movingTimeSeconds != null) {
      result.movingTimeSeconds += activity.movingTimeSeconds;
      result.movingTimeCount += 1;
    }
    if (activity.elevationGainMeters != null) {
      result.elevationGainMeters += activity.elevationGainMeters;
      result.elevationCount += 1;
    }
    return result;
  }, { distanceMeters: 0, distanceCount: 0, movingTimeSeconds: 0, movingTimeCount: 0, elevationGainMeters: 0, elevationCount: 0 });

  const sportCounts = {};
  const months = {};
  for (const activity of activities) {
    sportCounts[activity.sport] = (sportCounts[activity.sport] ?? 0) + 1;
    const month = activity.date.slice(0, 7);
    const bucket = (months[month] ??= { month, count: 0, distanceMeters: 0, distanceCount: 0 });
    bucket.count += 1;
    if (activity.distanceMeters != null) {
      bucket.distanceMeters += activity.distanceMeters;
      bucket.distanceCount += 1;
    }
  }

  return {
    summary: {
      activityCount: activities.length,
      dateRange: dates.length ? { start: dates[0], end: dates.at(-1) } : null,
      ...totals,
    },
    sportCounts,
    months: Object.values(months).sort((a, b) => a.month.localeCompare(b.month)),
    activities: [...activities].sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export async function loadDashboardData() {
  const csv = await readFile(DATA_FILE, 'utf8');
  return buildDashboardData(parseActivitiesCsv(csv));
}
