import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  closed?: boolean;
  pos?: string;
  idBoard?: string;
  subscribed?: boolean;
}

const listUpdate: ActionDefinition<Input> = {
  key: "list-update",
  type: "perform",
  resource: "list",
  title: "Update List",
  description: "Rename, archive, reposition or move a list to another board.",
  idempotent: true,
  params: [
    { key: "id", label: "List ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "closed", label: "Archived", type: "boolean" },
    {
      key: "pos",
      label: "Position",
      type: "string",
      hint: "`top`, `bottom`, or a positive number.",
    },
    { key: "idBoard", label: "Move to board ID", type: "string" },
    { key: "subscribed", label: "Subscribed", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(`/lists/${encodeURIComponent(input.id)}`, {
      method: "PUT",
      query: {
        name: unset(input.name),
        closed: input.closed,
        pos: unset(input.pos),
        idBoard: unset(input.idBoard),
        subscribed: input.subscribed,
      },
    });
  },
};

export default listUpdate;
