import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient } from "../lib/client.ts";

const shopGet: ActionDefinition<Record<string, never>> = {
  key: "shop-get",
  type: "read",
  resource: "shop",
  title: "Get Shop",
  description: "Fetch the store's own settings — currency, timezone, plan and address.",
  params: [],
  output: [
    { key: "shop.id", type: "number", label: "Shop ID" },
    { key: "shop.name", type: "string", label: "Name" },
    { key: "shop.currency", type: "string", label: "Currency" },
    { key: "shop.iana_timezone", type: "string", label: "Timezone" },
    { key: "shop.plan_name", type: "string", label: "Plan" },
  ],

  execute(_input, ctx) {
    return new ShopifyClient(ctx).request("/shop.json");
  },
};

export default shopGet;
