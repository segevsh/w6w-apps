import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  legalHoldId: string;
  startCursor?: string;
}

/** GET /admin/v1/legal_holds/{legal_hold_id}/workspaces — list-legal-hold-workspaces. */
const action: ActionDefinition<Input> = {
  key: "admin-list-legal-hold-workspaces",
  type: "read",
  resource: "admin",
  title: "Admin: List workspaces on a legal hold",
  description:
    "Admin: List workspaces on a legal hold. Requires an Enterprise organization bot token.",
  output: [{ "key": "workspace_ids", "type": "array", "label": "Workspace ids" }, {
    "key": "next_cursor",
    "type": "string",
    "label": "Next cursor",
  }],
  params: [{
    "key": "legalHoldId",
    "label": "Legal Hold ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, { "key": "startCursor", "label": "Start Cursor", "type": "string" }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/legal_holds/${pathId(input.legalHoldId)}/workspaces`, {
      method: "GET",
      admin: true,
      query: {
        "start_cursor": input.startCursor,
      },
    });
  },
};

export default action;
