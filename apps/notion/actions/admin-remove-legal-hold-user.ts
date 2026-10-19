import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  legalHoldId: string;
  userId: string;
}

/** DELETE /admin/v1/legal_holds/{legal_hold_id}/users/{user_id} — remove-legal-hold-user. */
const action: ActionDefinition<Input> = {
  key: "admin-remove-legal-hold-user",
  type: "perform",
  resource: "admin",
  title: "Admin: Remove a user from a legal hold",
  description:
    "Admin: Remove a user from a legal hold. Requires an Enterprise organization bot token.",
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
  idempotent: false,
  params: [{
    "key": "legalHoldId",
    "label": "Legal Hold ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }, {
    "key": "userId",
    "label": "User ID",
    "type": "string",
    "required": true,
    "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(
      `/legal_holds/${pathId(input.legalHoldId)}/users/${pathId(input.userId)}`,
      {
        method: "DELETE",
        admin: true,
      },
    );
  },
};

export default action;
