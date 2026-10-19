// Progress reports on the desktop dashboard (GET / POST /api/coach/report).
import { requestJson } from "./http";
import type { CoachReportData } from "./types";

/** The latest saved report, or null if none was written yet. */
export const fetchLatestReport = () => requestJson<{ report: CoachReportData | null }>("/api/coach/report");

/** Asks the coach for a new report on the last `range` days. Can take a minute on a slow PC. */
export const writeReport = (range: number) =>
  requestJson<{ report?: CoachReportData }>(`/api/coach/report?range=${range}`, { method: "POST" });
