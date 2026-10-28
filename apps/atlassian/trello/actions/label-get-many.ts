import type { ActionDefinition } from "@w6w/types";
import { TrelloClient } from "../lib/client.ts";

interface Input {
  idBoard: string;
  limit?: number;
}

const labelGetMany: ActionDefinition<Input, unknown[]> = {
  key: "label-get-many",
  type: "read",
  resource: "label",
  title: "Get Board Labels",
  description: "List the labels defined on a board.",
  params: [
    { key: "idBoard", label: "Board ID", type: "string", required: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Maximum labels to return (Trello caps this at 1000).",
      validation: { min: 1, max: 1000, integer: true },
    },
  ],
  output: [{ key: "", type: "array", label: "Labels" }],

  execute(input, ctx) {
    return new TrelloClient(ctx).request<unknown[]>(
      `/boards/${encodeURIComponent(input.idBoard)}/labels`,
      { query: { limit: input.limit } },
    );
  },
};

export default labelGetMany;
