import type { ActionDefinition } from "@w6w/types";
import { FindymailClient, seg } from "../lib/client.ts";

interface Input {
  id: number;
}

const deleteList: ActionDefinition<Input> = {
  key: "delete-list",
  type: "perform",
  resource: "list",
  title: "Delete Contact List",
  description: "Delete a contact list.",
  idempotent: true,
  params: [{ "key": "id", "label": "List ID", "type": "number", "required": true }],
  output: [{ "key": "deleted", "type": "boolean", "label": "Deleted" }, {
    "key": "id",
    "type": "number",
    "label": "List ID",
  }],

  async execute(input, ctx) {
    await new FindymailClient(ctx).request("DELETE", `/api/lists/${seg(input.id)}`);
    return { deleted: true, id: input.id };
  },
};

export default deleteList;
