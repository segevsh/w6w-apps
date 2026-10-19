import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  startCursor?: string;
  cursor?: string;
  pageSize?: string;
  userIds?: string | string[];
  workspaceIds?: string | string[];
}

/** GET /admin/v1/mcp_client_connections — list-mcp-client-connections. */
const action: ActionDefinition<Input> = {
  key: "admin-list-mcp-client-connections",
  type: "read",
  resource: "admin",
  title: "Admin: List MCP client connections in an organization",
  description:
    "Admin: List MCP client connections in an organization. Requires an Enterprise organization bot token.",
  output: [{ "key": "has_more", "type": "boolean", "label": "Has more" }, {
    "key": "results",
    "type": "array",
    "label": "Results",
  }, { "key": "next_cursor", "type": "string", "label": "Next cursor" }],
  params: [{
    "key": "startCursor",
    "label": "Start Cursor",
    "type": "string",
    "hint": "The `next_cursor` returned by the previous page.",
  }, {
    "key": "cursor",
    "label": "Cursor",
    "type": "string",
    "hint": "Deprecated; use `start_cursor`.",
  }, {
    "key": "pageSize",
    "label": "Page Size",
    "type": "string",
    "hint":
      "Number of results to return. Defaults to 100 and cannot exceed 100. Number of results per page (1–100).",
  }, {
    "key": "userIds",
    "label": "User IDS",
    "type": "json",
    "hint": "Member IDs to include. Use bracket encoding for multiple values.",
  }, {
    "key": "workspaceIds",
    "label": "Workspace IDS",
    "type": "json",
    "hint": "Workspace IDs to include. Use bracket encoding for multiple values.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/mcp_client_connections`, {
      method: "GET",
      admin: true,
      query: {
        "start_cursor": input.startCursor,
        "cursor": input.cursor,
        "page_size": input.pageSize,
        "user_ids[]": input.userIds,
        "workspace_ids[]": input.workspaceIds,
      },
    });
  },
};

export default action;
