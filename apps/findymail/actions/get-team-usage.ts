import type { ActionDefinition } from "@w6w/types";
import { FindymailClient } from "../lib/client.ts";

interface Input {
  from?: string;
  to?: string;
}

const getTeamUsage: ActionDefinition<Input> = {
  key: "get-team-usage",
  type: "read",
  resource: "usage",
  title: "Get Team Usage",
  description:
    "Credit usage per team member over a date range. Team owners only (403 otherwise). Defaults to the last 30 days.",
  params: [{ "key": "from", "label": "From", "type": "string", "hint": "YYYY-MM-DD, inclusive." }, {
    "key": "to",
    "label": "To",
    "type": "string",
    "hint": "YYYY-MM-DD, inclusive.",
  }],
  output: [
    { "key": "from", "type": "string", "label": "From" },
    { "key": "to", "type": "string", "label": "To" },
    { "key": "total", "type": "object", "label": "Totals (finder, verifier)" },
    { "key": "members", "type": "array", "label": "Per-member usage" },
  ],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("GET", "/api/credits/report/team-summary", {
      query: { from: input.from, to: input.to },
    });
  },
};

export default getTeamUsage;
