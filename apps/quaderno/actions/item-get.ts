import type { ActionDefinition } from "@w6w/types";
import { QuadernoClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const itemGet: ActionDefinition<Input> = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get Item",
  description: "Fetch a single product (item) by ID.",
  params: [
    { key: "id", label: "Item ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "code", type: "string", label: "Code" },
    { key: "name", type: "string", label: "Name" },
    { key: "unit_cost", type: "string", label: "Unit cost" },
  ],

  execute(input, ctx) {
    return new QuadernoClient(ctx).request(`/items/${input.id}`);
  },
};

export default itemGet;
