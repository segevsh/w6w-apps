import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  id: string;
  fields?: string;
}

const cardGet: ActionDefinition<Input> = {
  key: "card-get",
  type: "read",
  resource: "card",
  title: "Get Card",
  description: "Fetch a card by id or short link.",
  params: [
    { key: "id", label: "Card ID", type: "string", required: true, hint: "Full id or short link." },
    { key: "fields", label: "Fields", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Card ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "desc", type: "string", label: "Description" },
    { key: "due", type: "string", label: "Due" },
    { key: "idList", type: "string", label: "List ID" },
    { key: "url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(`/cards/${encodeURIComponent(input.id)}`, {
      query: { fields: unset(input.fields) },
    });
  },
};

export default cardGet;
