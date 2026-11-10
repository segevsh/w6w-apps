import type { TriggerDefinition } from "@w6w/types";
import timeList from "../actions/time-list.ts";
import { daysAgo, LOOKBACK_PARAM, lookbackDays, snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /team/time` (https://developers.everhour.com/api-reference/time-records/get-all-time-records.md)
 * filters by the WORK date (`from`/`to`), never by when a record was created, and has no order. So
 * each check reads the records dated in the last N days (default 3, paged 1000 at a time) and
 * diffs that window as a snapshot: a record counts as new when it first appears in the window.
 * A record backdated beyond the window is not seen. Edits and removals never emit.
 */
const trigger: TriggerDefinition = snapshotTrigger({
  key: "new-time-record",
  title: "New Time Record",
  description: "The run gets each team time record newly dated within the look-back window.",
  noun: "time records",
  params: [LOOKBACK_PARAM],
  output: [
    { key: "id", type: "number", label: "Time record ID" },
    { key: "time", type: "number", label: "Seconds recorded" },
    { key: "user", type: "number", label: "User ID" },
    { key: "date", type: "string", label: "Work date" },
    { key: "task", type: "object", label: "Task" },
    { key: "comment", type: "string", label: "Comment" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: 2660155,
    time: 3600,
    user: 1304,
    date: "2026-11-10",
    task: { id: "ev:9876543210", name: "Write launch post" },
    comment: "Draft",
    createdAt: "2026-11-10 09:30:00",
  },
  read: (params, page, ctx) =>
    timeList.execute({
      from: daysAgo(lookbackDays(params)),
      to: daysAgo(0),
      limit: 1000,
      page,
    }, ctx),
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
});

export default trigger;
