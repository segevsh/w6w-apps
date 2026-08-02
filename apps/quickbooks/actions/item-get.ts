import type { ActionDefinition } from "@w6w/types";
import { QuickBooksClient } from "../lib/client.ts";
import { itemId } from "../lib/params.ts";

interface Input {
  itemId: string;
}

const itemGet: ActionDefinition<Input> = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get Item",
  description: "Read a single product or service by Id.",
  params: [itemId],
  output: [{ key: "Item", type: "object", label: "Item" }],

  execute(input, ctx) {
    return new QuickBooksClient(ctx).request(`/item/${encodeURIComponent(input.itemId)}`);
  },
};

export default itemGet;
