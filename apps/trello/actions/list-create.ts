import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  name: string;
  idBoard: string;
  idListSource?: string;
  pos?: string;
}

const listCreate: ActionDefinition<Input> = {
  key: "list-create",
  type: "perform",
  resource: "list",
  title: "Create List",
  description: "Add a list (column) to a board.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "idBoard", label: "Board ID", type: "string", required: true },
    { key: "idListSource", label: "Copy from list ID", type: "string" },
    {
      key: "pos",
      label: "Position",
      type: "string",
      default: "bottom",
      hint: "`top`, `bottom`, or a positive number.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "idBoard", type: "string", label: "Board ID" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request("/lists", {
      method: "POST",
      query: {
        name: input.name,
        idBoard: input.idBoard,
        idListSource: unset(input.idListSource),
        pos: unset(input.pos),
      },
    });
  },
};

export default listCreate;
