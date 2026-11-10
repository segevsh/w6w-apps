import { pollFromListAction } from "../../_shared/poll/mod.ts";
import timesheetList from "../actions/timesheet-list.ts";
import { idOf, rows } from "../lib/triggers.ts";

/**
 * Wraps `timesheet-list` with `order_by=id_desc` — the documented `order_by` enum for
 * GET /2.0/timesheet takes an `_desc` suffix (https://docs.bexio.com, verified 2026-11-10).
 */
export default pollFromListAction({
  key: "new-timesheet",
  title: "New Timesheet",
  description: "The run gets each newly tracked timesheet entry (sorted by ID, newest first).",
  action: timesheetList,
  input: () => ({ orderBy: "id", descending: true, limit: 100, offset: 0 }),
  items: rows,
  idOf: idOf,
  output: [
    { key: "id", type: "number", label: "Timesheet ID" },
    { key: "date", type: "string", label: "Date" },
    { key: "duration", type: "string", label: "Duration" },
  ],
  sample: { id: 101, date: "2026-11-09", duration: "01:30" },
  maxPages: 1,
});
