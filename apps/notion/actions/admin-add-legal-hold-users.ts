import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  legalHoldId: string;
  userIds: unknown[];
}

/** POST /admin/v1/legal_holds/{legal_hold_id}/users — add-legal-hold-users. */
const action: ActionDefinition<Input> = {
  key: "admin-add-legal-hold-users",
  type: "perform",
  resource: "admin",
  title: "Admin: Add users to a legal hold",
  description: "Admin: Add users to a legal hold. Requires an Enterprise organization bot token.",
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
  }, { "key": "userIds", "label": "User IDS", "type": "json", "required": true }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/legal_holds/${pathId(input.legalHoldId)}/users`, {
      method: "POST",
      admin: true,
      body: {
        "user_ids": input.userIds,
      },
    });
  },
};

export default action;
