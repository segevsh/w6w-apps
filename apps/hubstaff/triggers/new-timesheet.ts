import { ORGANIZATION_ID_PARAM, snapshotFeed } from "../lib/triggers.ts";
import action from "../actions/timesheet-list.ts";

export const clock = { now: (): number => Date.now() };

/** Days of timesheet periods each check reads (`date[start]` .. `date[stop]`, ISO dates). */
const WINDOW_DAYS = 90;
const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * `GET /v2/organizations/{id}/timesheets` takes `date[start]` and an inclusive `date[stop]`
 * (https://api.hubstaff.com/v2/docs). The trigger reads the periods of the last 90 days up to
 * today (UTC) and diffs the timesheet ids.
 */
export default snapshotFeed({
  key: "new-timesheet",
  title: "New Timesheet",
  description: "The run gets each timesheet newly created in a Hubstaff organization.",
  action,
  params: [ORGANIZATION_ID_PARAM],
  input: ({ params, cursor, pageSize }) => ({
    organization_id: params.organizationId,
    date_start: day(clock.now() - WINDOW_DAYS * 86_400_000),
    date_stop: day(clock.now()),
    page_limit: pageSize,
    page_start_id: cursor,
  }),
  items: (result) => (result as { timesheets?: Array<Record<string, unknown>> }).timesheets ?? [],
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Timesheet ID" },
    { key: "user_id", type: "number", label: "User ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "start_date", type: "string", label: "Period start" },
    { key: "stop_date", type: "string", label: "Period stop" },
    { key: "tracked", type: "number", label: "Tracked seconds" },
  ],
  sample: {
    id: 9001,
    user_id: 651956,
    status: "open",
    start_date: "2026-11-02",
    stop_date: "2026-11-08",
    tracked: 72000,
  },
});
