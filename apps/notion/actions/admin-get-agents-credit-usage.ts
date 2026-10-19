import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  spaceId: string;
  cursor?: string;
  pageSize?: number;
  includeDeleted?: "false" | "true";
  creditUsageTimeFrom?: string;
  creditUsageTimeTo?: string;
}

/** GET /admin/v1/spaces/{space_id}/agents/credit_usage — get-agents-credit-usage. */
const action: ActionDefinition<Input> = {
  key: "admin-get-agents-credit-usage",
  type: "read",
  resource: "admin",
  title: "Admin: Get credit usage for agents in a space",
  description:
    "Admin: Get credit usage for agents in a space. Requires an Enterprise organization bot token.",
  output: [{ "key": "has_more", "type": "boolean", "label": "Has more" }, {
    "key": "results",
    "type": "array",
    "label": "Results",
  }, { "key": "next_cursor", "type": "string", "label": "Next cursor" }],
  params: [{
    "key": "spaceId",
    "label": "Space ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, {
    "key": "cursor",
    "label": "Cursor",
    "type": "string",
    "hint":
      "Cursor for the agent page. Nested cursors continue one agent's billing periods through the single-agent endpoint.",
  }, {
    "key": "pageSize",
    "label": "Page Size",
    "type": "number",
    "hint":
      "Number of agents per page. Defaults to 100, maximum 100. Number of results per page (1–100).",
    "validation": { "min": 1, "max": 100, "integer": true },
  }, {
    "key": "includeDeleted",
    "label": "Include Deleted",
    "type": "select",
    "options": [{ "value": "false", "label": "false" }, { "value": "true", "label": "true" }],
    "hint":
      'Set to "true" to include soft-deleted and permanently deleted agents with retained credit usage; included deleted agents have status "deleted". Omit this parameter or set it to "false" to return only live agents.',
  }, {
    "key": "creditUsageTimeFrom",
    "label": "Credit Usage Time From",
    "type": "string",
    "hint":
      "Epoch ms, inclusive. When either bound is set, an agent is returned only if its latest credit usage is inside the [from, to] window; agents with no in-window usage are excluded entirely, and last_credit_usage_time on each result reflects the most recent credit usage within the window.",
  }, {
    "key": "creditUsageTimeTo",
    "label": "Credit Usage Time To",
    "type": "string",
    "hint": "Epoch ms, inclusive. See credit_usage_time_from for the window semantics.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/spaces/${pathId(input.spaceId)}/agents/credit_usage`, {
      method: "GET",
      admin: true,
      query: {
        "cursor": input.cursor,
        "page_size": input.pageSize,
        "include_deleted": input.includeDeleted,
        "credit_usage_time_from": input.creditUsageTimeFrom,
        "credit_usage_time_to": input.creditUsageTimeTo,
      },
    });
  },
};

export default action;
