import type { ActionDefinition } from "@w6w/types";
import { FindymailClient } from "../lib/client.ts";

interface Input {
  signal_type?: string;
  monitor_id?: number;
  date_from?: string;
  date_to?: string;
  relevance_scores?: string;
  page?: number;
  per_page?: number;
}

const listSignals: ActionDefinition<Input> = {
  key: "list-signals",
  type: "read",
  resource: "signal",
  title: "List Signals",
  description:
    "List signals raised by the monitors the user owns or shares with the team, filterable by type, monitor and date. A 404 with an empty body means the Signals feature is disabled on the account.",
  params: [
    {
      "key": "signal_type",
      "label": "Signal type",
      "type": "select",
      "options": [
        { "value": "keyword_mention", "label": "keyword_mention" },
        { "value": "new_hire", "label": "new_hire" },
        { "value": "job_change", "label": "job_change" },
        { "value": "post_engagement", "label": "post_engagement" },
      ],
    },
    { "key": "monitor_id", "label": "Monitor ID", "type": "number" },
    { "key": "date_from", "label": "Detected from", "type": "string", "hint": "YYYY-MM-DD." },
    { "key": "date_to", "label": "Detected to", "type": "string", "hint": "YYYY-MM-DD." },
    {
      "key": "relevance_scores",
      "label": "Relevance scores",
      "type": "string",
      "hint": "Comma-separated AI relevance scores, 0-5.",
    },
    { "key": "page", "label": "Page", "type": "number" },
    { "key": "per_page", "label": "Per page", "type": "number", "hint": "Max 100, default 50." },
  ],
  output: [{ "key": "data", "type": "array", "label": "Signals" }, {
    "key": "current_page",
    "type": "number",
    "label": "Page",
  }, { "key": "total", "type": "number", "label": "Total" }],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("GET", "/api/signals", {
      query: {
        signal_type: input.signal_type,
        monitor_id: input.monitor_id,
        date_from: input.date_from,
        date_to: input.date_to,
        relevance_scores: input.relevance_scores,
        page: input.page,
        per_page: input.per_page,
      },
    });
  },
};

export default listSignals;
