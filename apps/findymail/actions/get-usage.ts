import type { ActionDefinition } from "@w6w/types";
import { FindymailClient } from "../lib/client.ts";

interface Input {
  from?: string;
  to?: string;
}

const getUsage: ActionDefinition<Input> = {
  key: "get-usage",
  type: "read",
  resource: "usage",
  title: "Get Usage",
  description:
    "Daily (periods under 2 months) or monthly credit usage of the authenticated user. Defaults to the last 30 days.",
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
    { "key": "items", "type": "array", "label": "Per-period usage" },
  ],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("GET", "/api/credits/report/summary", {
      query: { from: input.from, to: input.to },
    });
  },
};

export default getUsage;
