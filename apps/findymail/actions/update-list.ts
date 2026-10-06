import type { ActionDefinition } from "@w6w/types";
import { FindymailClient, seg } from "../lib/client.ts";

interface Input {
  id: number;
  name: string;
  isShared: boolean;
}

const updateList: ActionDefinition<Input> = {
  key: "update-list",
  type: "perform",
  resource: "list",
  title: "Update Contact List",
  description:
    "Rename a contact list and set whether it is shared with the team. Both fields are required by the API.",
  idempotent: true,
  params: [{ "key": "id", "label": "List ID", "type": "number", "required": true }, {
    "key": "name",
    "label": "Name",
    "type": "string",
    "required": true,
    "hint": "New name of the list.",
  }, {
    "key": "isShared",
    "label": "Shared with team",
    "type": "boolean",
    "required": true,
    "hint": "Enable or disable sharing the list with your team.",
  }],
  output: [
    { "key": "id", "type": "number", "label": "List ID" },
    { "key": "name", "type": "string", "label": "Name" },
    { "key": "created_at", "type": "string", "label": "Created at" },
    { "key": "updated_at", "type": "string", "label": "Updated at" },
    { "key": "shared_with_team", "type": "boolean", "label": "Shared with team" },
    { "key": "is_owner", "type": "boolean", "label": "Caller owns the list" },
  ],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("PUT", `/api/lists/${seg(input.id)}`, {
      body: { name: input.name, isShared: input.isShared },
    });
  },
};

export default updateList;
