import type { ActionDefinition } from "@w6w/types";
import { EverhourClient } from "../lib/client.ts";

/**
 * `GET /timesheets` — List the team's timesheets for one week.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  weekId?: number;
}

const timesheetList: ActionDefinition<Input> = {
  key: "timesheet-list",
  type: "search",
  resource: "timesheet",
  title: "List Team Timesheets",
  description: "List the team's timesheets for one week.",
  params: [
    {
      key: "weekId",
      label: "Week ID",
      type: "number",
      hint: "Two-digit year + week number, e.g. 2535 = week 35 of 2025.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "count", type: "number", label: "Records in this response" },
    {
      key: "nextPage",
      type: "number",
      label: "Next page number, or null when there is no further page",
    },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).many(`/timesheets`, { query: { "weekId": input.weekId } });
  },
};

export default timesheetList;
