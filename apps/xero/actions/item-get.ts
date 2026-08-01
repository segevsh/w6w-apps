import type { ActionDefinition } from "@w6w/types";
import { XeroClient } from "../lib/client.ts";
import { itemId } from "../lib/params.ts";

interface Input {
  itemId: string;
}

const itemGet: ActionDefinition<Input> = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get Item",
  description: "Retrieve one item by its ItemID or Code.",
  params: [itemId],
  output: [{ key: "Items", type: "array", label: "Items" }],

  execute(input, ctx) {
    return new XeroClient(ctx).request(`/Items/${encodeURIComponent(input.itemId)}`);
  },
};

export default itemGet;
