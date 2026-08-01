import type { Param } from "@w6w/types";

/** Almost every Activities endpoint is scoped to one activity id. */
export const activityId: Param = {
  key: "activityId",
  label: "Activity ID",
  type: "string",
  required: true,
  hint: "The activity's numeric identifier, as returned by List Activities or Get Activity.",
};

/** Page/per-page, the shape Strava's list endpoints use. */
export const pagination: Param[] = [
  {
    key: "perPage",
    label: "Per page",
    type: "number",
    default: 30,
    row: "page",
    validation: { min: 1, max: 200, integer: true },
    hint: "Strava caps this at 200.",
  },
  {
    key: "page",
    label: "Page",
    type: "number",
    default: 1,
    row: "page",
    validation: { min: 1, integer: true },
  },
];

export const summaryActivityOutput = [
  { key: "id", type: "number" as const, label: "Activity ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "sport_type", type: "string" as const, label: "Sport type" },
  { key: "start_date", type: "string" as const, label: "Start date (UTC)" },
  { key: "distance", type: "number" as const, label: "Distance (m)" },
  { key: "moving_time", type: "number" as const, label: "Moving time (s)" },
  { key: "elapsed_time", type: "number" as const, label: "Elapsed time (s)" },
  { key: "total_elevation_gain", type: "number" as const, label: "Elevation gain (m)" },
];
