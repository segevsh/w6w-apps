import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  name: string;
  startDate: number;
  userIds: unknown[];
  userInteractionType: unknown[];
  description?: string;
  endDate?: number;
  icon?: string;
}

/** POST /admin/v1/legal_holds — create-legal-hold. */
const action: ActionDefinition<Input> = {
  key: "admin-create-legal-hold",
  type: "perform",
  resource: "admin",
  title: "Admin: Create a legal hold",
  description: "Admin: Create a legal hold. Requires an Enterprise organization bot token.",
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
    { "key": "name", "label": "Name", "type": "string", "required": true },
    { "key": "startDate", "label": "Start Date", "type": "number", "required": true },
    { "key": "userIds", "label": "User IDS", "type": "json", "required": true },
    {
      "key": "userInteractionType",
      "label": "User Interaction Type",
      "type": "json",
      "required": true,
    },
    { "key": "description", "label": "Description", "type": "string" },
    { "key": "endDate", "label": "End Date", "type": "number" },
    { "key": "icon", "label": "Icon", "type": "string" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/legal_holds`, {
      method: "POST",
      admin: true,
      body: {
        "name": input.name,
        "start_date": input.startDate,
        "user_ids": input.userIds,
        "user_interaction_type": input.userInteractionType,
        "description": input.description,
        "end_date": input.endDate,
        "icon": input.icon,
      },
    });
  },
};

export default action;
