import type { TriggerDefinition } from "@w6w/types";
import timecardList from "../actions/timecard-list.ts";
import { daysAgo, LOOKBACK_PARAM, lookbackDays, snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /timecards` (https://developers.everhour.com/api-reference/timecards/get-all-timecards.md)
 * filters by date (`from`/`to`, last two weeks by default), has no order and no timecard id; a
 * timecard is one user's clock-in day, so `user:date` is its key. Each check reads the last N days
 * (default 3) and diffs that window as a snapshot; only additions (a user's first clock-in of a
 * day) emit.
 */
const trigger: TriggerDefinition = snapshotTrigger({
  key: "new-timecard",
  title: "New Timecard",
  description: "The run gets each timecard newly started (a user's first clock-in of a day).",
  noun: "timecards",
  params: [LOOKBACK_PARAM],
  output: [
    { key: "user", type: "number", label: "User ID" },
    { key: "date", type: "string", label: "Date" },
    { key: "clockIn", type: "string", label: "Clock-in time" },
    { key: "clockOut", type: "string", label: "Clock-out time" },
    { key: "workTime", type: "number", label: "Working seconds" },
    { key: "breakTime", type: "number", label: "Break seconds" },
  ],
  sample: {
    user: 1304,
    date: "2026-11-10",
    clockIn: "09:00",
    clockOut: "18:00",
    workTime: 28800,
    breakTime: 3600,
  },
  read: (params, _page, ctx) =>
    timecardList.execute({ from: daysAgo(lookbackDays(params)), to: daysAgo(0) }, ctx),
  keyOf: (item) => {
    const t = item as { user?: unknown; date?: unknown };
    return `${String(t.user ?? "")}:${String(t.date ?? "")}`;
  },
});

export default trigger;
