import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  legalHoldId: string;
}

/** GET /admin/v1/legal_holds/{legal_hold_id} — get-legal-hold. */
const action: ActionDefinition<Input> = {
  key: "admin-get-legal-hold",
  type: "read",
  resource: "admin",
  title: "Admin: Retrieve a legal hold",
  description: "Admin: Retrieve a legal hold. Requires an Enterprise organization bot token.",
  output: [
    { "key": "created_by", "type": "string", "label": "Created by" },
    { "key": "created_time", "type": "number", "label": "Created time" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "start_date", "type": "number", "label": "Start date" },
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "user_interaction_type", "type": "array", "label": "User interaction type" },
    { "key": "users", "type": "object", "label": "Users" },
    { "key": "workspaces", "type": "object", "label": "Workspaces" },
    { "key": "description", "type": "string", "label": "Description" },
    { "key": "end_date", "type": "number", "label": "End date" },
    { "key": "icon", "type": "string", "label": "Icon" },
    { "key": "name", "type": "string", "label": "Name" },
  ],
  params: [{
    "key": "legalHoldId",
    "label": "Legal Hold ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/legal_holds/${pathId(input.legalHoldId)}`, {
      method: "GET",
      admin: true,
    });
  },
};

export default action;
