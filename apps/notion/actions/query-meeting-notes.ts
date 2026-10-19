import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  filter?: Record<string, unknown>;
  sort?: unknown[];
  limit?: number;
}

/** POST /v1/blocks/meeting_notes/query — query-meeting-notes. */
const action: ActionDefinition<Input> = {
  key: "query-meeting-notes",
  type: "read",
  resource: "block",
  title: "Query Meeting Notes",
  description: "Query meeting notes.",
  output: [{ "key": "results", "type": "array", "label": "Results" }, {
    "key": "has_more",
    "type": "boolean",
    "label": "Has more",
  }],
  params: [{
    "key": "filter",
    "label": "Filter",
    "type": "json",
    "hint":
      "Optional filter for querying meeting notes. Supports combinator (and/or) and property filters on title, attendees, created_time, created_by, last_edited_time, last_edited_by.",
  }, {
    "key": "sort",
    "label": "Sort",
    "type": "json",
    "hint":
      "Optional sort order for the results. Each entry specifies a property name and direction.",
  }, {
    "key": "limit",
    "label": "Limit",
    "type": "number",
    "hint": "Maximum number of results to return. Defaults to 50.",
    "validation": { "min": 1, "max": 50, "integer": true },
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/blocks/meeting_notes/query`, {
      method: "POST",
      body: {
        "filter": input.filter,
        "sort": input.sort,
        "limit": input.limit,
      },
    });
  },
};

export default action;
