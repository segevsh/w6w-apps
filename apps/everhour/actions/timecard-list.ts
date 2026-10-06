import type { ActionDefinition } from "@w6w/types";
import { EverhourClient } from "../lib/client.ts";

/**
 * `GET /timecards` — List the whole team's timecards (the last two weeks by default).
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  from?: string;
  to?: string;
}

const timecardList: ActionDefinition<Input> = {
  key: "timecard-list",
  type: "search",
  resource: "timecard",
  title: "List All Timecards",
  description: "List the whole team's timecards (the last two weeks by default).",
  params: [
    { key: "from", label: "From", type: "date", hint: "Start date, YYYY-MM-DD." },
    { key: "to", label: "To", type: "date", hint: "End date, YYYY-MM-DD." },
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
    return new EverhourClient(ctx).many(`/timecards`, {
      query: { "from": input.from, "to": input.to },
    });
  },
};

export default timecardList;
