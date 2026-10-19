import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  legalHoldId: string;
  description?: string;
  icon?: string;
  name?: string;
}

/** PATCH /admin/v1/legal_holds/{legal_hold_id} — update-legal-hold. */
const action: ActionDefinition<Input> = {
  key: "admin-update-legal-hold",
  type: "perform",
  resource: "admin",
  title: "Admin: Update a legal hold",
  description: "Admin: Update a legal hold. Requires an Enterprise organization bot token.",
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
  params: [
    {
      "key": "legalHoldId",
      "label": "Legal Hold ID",
      "type": "string",
      "required": true,
      "hint": "Notion resource ID. Use the corresponding list or search action to find it.",
    },
    { "key": "description", "label": "Description", "type": "string" },
    { "key": "icon", "label": "Icon", "type": "string" },
    { "key": "name", "label": "Name", "type": "string" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/legal_holds/${pathId(input.legalHoldId)}`, {
      method: "PATCH",
      admin: true,
      body: {
        "description": input.description,
        "icon": input.icon,
        "name": input.name,
      },
    });
  },
};

export default action;
