import type { ActionDefinition } from "@w6w/types";
import { XeroClient } from "../lib/client.ts";
import { listFilters } from "../lib/params.ts";

interface Input {
  where?: string;
  order?: string;
}

const itemList: ActionDefinition<Input> = {
  key: "item-list",
  type: "read",
  resource: "item",
  title: "List Items",
  description: "List the products and services (inventory and non-inventory) items.",
  params: listFilters,
  output: [{ key: "Items", type: "array", label: "Items" }],

  execute(input, ctx) {
    return new XeroClient(ctx).request("/Items", {
      query: { where: input.where, order: input.order },
    });
  },
};

export default itemList;
