import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  id: string;
  limit?: number;
  fields?: string;
}

const listGetCards: ActionDefinition<Input, unknown[]> = {
  key: "list-get-cards",
  type: "read",
  resource: "list",
  title: "Get Cards in List",
  description: "List the cards currently in a list.",
  params: [
    { key: "id", label: "List ID", type: "string", required: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Maximum cards to return (Trello caps this at 1000).",
      validation: { min: 1, max: 1000, integer: true },
    },
    { key: "fields", label: "Fields", type: "string" },
  ],
  output: [{ key: "", type: "array", label: "Cards" }],

  execute(input, ctx) {
    return new TrelloClient(ctx).request<unknown[]>(
      `/lists/${encodeURIComponent(input.id)}/cards`,
      { query: { limit: input.limit, fields: unset(input.fields) } },
    );
  },
};

export default listGetCards;
