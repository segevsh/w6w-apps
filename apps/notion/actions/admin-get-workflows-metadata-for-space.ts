import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  spaceId: string;
  name?: string;
  createdByIds?: string[];
  createdTimeFrom?: string;
  createdTimeTo?: string;
  lastEditedTimeFrom?: string;
  lastEditedTimeTo?: string;
  creditUsageTimeFrom?: string;
  creditUsageTimeTo?: string;
  status?: string[];
  integrationTypes?: string[];
  mcpServerNames?: string[];
  models?: string[];
  sharedWithUserIds?: string[];
  sharedWithGroupIds?: string[];
  cursor?: string;
  pageSize?: number;
}

/** GET /admin/v1/spaces/{space_id}/agents — get-workflows-metadata-for-space. */
const action: ActionDefinition<Input> = {
  key: "admin-get-workflows-metadata-for-space",
  type: "read",
  resource: "admin",
  title: "Admin: Get agents in a space",
  description: "Admin: Get agents in a space. Requires an Enterprise organization bot token.",
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
    "key": "name",
    "label": "Name",
    "type": "string",
    "hint":
      "Case-insensitive substring match against the agent name or description. Every other string filter uses exact matching against its target field values.",
  }, {
    "key": "createdByIds",
    "label": "Created By IDS",
    "type": "array",
    "item": { "type": "string" },
    "hint": "User IDs of agent creators to filter by.",
  }, {
    "key": "createdTimeFrom",
    "label": "Created Time From",
    "type": "string",
    "hint":
      "Inclusive lower bound on created_time, as epoch-millisecond digits. Requests with non-numeric values return a validation error.",
  }, {
    "key": "createdTimeTo",
    "label": "Created Time To",
    "type": "string",
    "hint":
      "Inclusive upper bound on created_time, as epoch-millisecond digits. Requests with non-numeric values return a validation error.",
  }, {
    "key": "lastEditedTimeFrom",
    "label": "Last Edited Time From",
    "type": "string",
    "hint":
      "Inclusive lower bound on last_edited_time, as epoch-millisecond digits. Requests with non-numeric values return a validation error.",
  }, {
    "key": "lastEditedTimeTo",
    "label": "Last Edited Time To",
    "type": "string",
    "hint":
      "Inclusive upper bound on last_edited_time, as epoch-millisecond digits. Requests with non-numeric values return a validation error.",
  }, {
    "key": "creditUsageTimeFrom",
    "label": "Credit Usage Time From",
    "type": "string",
    "hint":
      "Epoch ms, inclusive. When either bound is set, an agent is returned only if its latest credit usage is inside the [from, to] window; agents with no in-window usage are excluded entirely, and last_credit_usage_time reflects the most recent credit usage of the agent.",
  }, {
    "key": "creditUsageTimeTo",
    "label": "Credit Usage Time To",
    "type": "string",
    "hint": "Epoch ms, inclusive. See credit_usage_time_from for the window semantics.",
  }, {
    "key": "status",
    "label": "Status",
    "type": "array",
    "item": { "type": "string" },
    "hint":
      'Status filter. Accepts every response status value, plus the "disabled" convenience bucket for admin-disabled agents.',
  }, {
    "key": "integrationTypes",
    "label": "Integration Types",
    "type": "array",
    "item": { "type": "string" },
    "hint": 'Integration types to filter by, such as "slack", "github", or "mcpServer".',
  }, {
    "key": "mcpServerNames",
    "label": "MCP Server Names",
    "type": "array",
    "item": { "type": "string" },
    "hint": "MCP server names to filter by.",
  }, {
    "key": "models",
    "label": "Models",
    "type": "array",
    "item": { "type": "string" },
    "hint":
      'Agent models to filter by. Accepts model display names (such as "Claude 4 Sonnet") as shown in the response model field.',
  }, {
    "key": "sharedWithUserIds",
    "label": "Shared With User IDS",
    "type": "array",
    "item": { "type": "string" },
    "hint":
      "Filter to agents shared with any of these user IDs. Matches custom agents only: database (autofill) agents are excluded whenever this filter is set, since their sharing state is not exposed.",
  }, {
    "key": "sharedWithGroupIds",
    "label": "Shared With Group IDS",
    "type": "array",
    "item": { "type": "string" },
    "hint":
      "Filter to agents shared with any of these group IDs. Matches custom agents only: database (autofill) agents are excluded whenever this filter is set, since their sharing state is not exposed.",
  }, {
    "key": "cursor",
    "label": "Cursor",
    "type": "string",
    "hint": "Pagination cursor returned from a previous response's next_cursor.",
  }, {
    "key": "pageSize",
    "label": "Page Size",
    "type": "number",
    "hint":
      "Number of agents per page. Defaults to 25, maximum 100. Number of results per page (1–100).",
    "validation": { "min": 1, "max": 100, "integer": true },
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/spaces/${pathId(input.spaceId)}/agents`, {
      method: "GET",
      admin: true,
      query: {
        "name": input.name,
        "created_by_ids": input.createdByIds,
        "created_time_from": input.createdTimeFrom,
        "created_time_to": input.createdTimeTo,
        "last_edited_time_from": input.lastEditedTimeFrom,
        "last_edited_time_to": input.lastEditedTimeTo,
        "credit_usage_time_from": input.creditUsageTimeFrom,
        "credit_usage_time_to": input.creditUsageTimeTo,
        "status": input.status,
        "integration_types": input.integrationTypes,
        "mcp_server_names": input.mcpServerNames,
        "models": input.models,
        "shared_with_user_ids": input.sharedWithUserIds,
        "shared_with_group_ids": input.sharedWithGroupIds,
        "cursor": input.cursor,
        "page_size": input.pageSize,
      },
    });
  },
};

export default action;
