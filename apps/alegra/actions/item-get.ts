import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, idPath } from "../lib/client.ts";

interface Input {
  id: string;
}

const itemGet: ActionDefinition<Input> = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get Item",
  description: "Fetch one product or service by id.",
  params: [
    {
      "key": "id",
      "label": "ID",
      "type": "string",
      "required": true,
      "hint": "Alegra ids are STRINGS (numeric-looking, or a UUID on newer accounts).",
    },
  ],
  output: [{ key: "id", type: "string", label: "ID" }],

  async execute(input, ctx) {
    const client = new AlegraClient(ctx);
    return await client.request(`/items/${idPath(input.id)}`);
  },
};

export default itemGet;
