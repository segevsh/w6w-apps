import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  pageSize?: number;
  startCursor?: string;
}

/** GET /admin/v1/analytics/reports — list-analytics-reports. */
const action: ActionDefinition<Input> = {
  key: "admin-list-analytics-reports",
  type: "read",
  resource: "admin",
  title: "Admin: List analytics reports",
  description: "Admin: List analytics reports. Requires an Enterprise organization bot token.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "results", "type": "array", "label": "Results" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "next_cursor", "type": "object", "label": "Next cursor" },
  ],
  params: [{ "key": "workspaceId", "label": "Workspace ID", "type": "string", "required": true }, {
    "key": "pageSize",
    "label": "Page Size",
    "type": "number",
    "hint": "Number of results per page (1–100).",
    "validation": { "min": 1, "max": 100, "integer": true },
  }, { "key": "startCursor", "label": "Start Cursor", "type": "string" }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/analytics/reports`, {
      method: "GET",
      admin: true,
      query: {
        "workspace_id": input.workspaceId,
        "page_size": input.pageSize,
        "start_cursor": input.startCursor,
      },
    });
  },
};

export default action;
