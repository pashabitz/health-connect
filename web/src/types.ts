export type Activity = {
  date: string;
  name: string;
  sport: string;
  movingTimeSeconds: number | null;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
};

export type Dashboard = {
  summary: {
    activityCount: number;
    dateRange: { start: string; end: string } | null;
    distanceMeters: number;
    distanceCount: number;
    movingTimeSeconds: number;
    movingTimeCount: number;
    elevationGainMeters: number;
    elevationCount: number;
  };
  sportCounts: Record<string, number>;
  months: Array<{ month: string; count: number; distanceMeters: number; distanceCount: number }>;
  activities: Activity[];
};

export type DashboardFilterState = {
  startDate: string;
  endDate: string;
  sport: string;
  datesReversed: boolean;
};