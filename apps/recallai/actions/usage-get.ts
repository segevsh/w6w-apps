import type { ActionDefinition } from "@w6w/types";
import { RecallClient } from "../lib/client.ts";

interface Input {
  start?: string;
  end?: string;
}

/** `GET /api/v1/billing/usage/` — `{ bot_total }`. Rate limit: 5 requests per minute. */
const usageGet: ActionDefinition<Input> = {
  key: "usage-get",
  type: "read",
  resource: "billing",
  title: "Get Bot Usage",
  description: "Get bot usage for the workspace over a time range (`bot_total`).",
  params: [
    { key: "start", label: "Start", type: "datetime", hint: "ISO 8601." },
    { key: "end", label: "End", type: "datetime", hint: "ISO 8601." },
  ],
  output: [{ key: "bot_total", type: "number", label: "Total bot usage in the range" }],

  execute(input, ctx) {
    return new RecallClient(ctx).request("GET", "/api/v1/billing/usage/", {
      query: { start: input.start, end: input.end },
    });
  },
};

export default usageGet;
