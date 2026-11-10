import type { ActionDefinition } from "@w6w/types";
import { chargebeeTrigger } from "../lib/triggers.ts";
import listItemPrices from "../actions/list-item-prices.ts";

export default chargebeeTrigger({
  key: "new-or-updated-item-price",
  title: "New or Updated Item Price",
  description: "The run gets each item price when it is created and each time it is updated.",
  action: listItemPrices as ActionDefinition,
  wrapper: "item_price",
  sortAttribute: "updated_at",
  stamp: "updated_at",
  output: [
    { key: "id", type: "string", label: "Item price ID" },
    { key: "item_id", type: "string", label: "Item ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "currency_code", type: "string", label: "Currency" },
    { key: "price", type: "number", label: "Price (minor units)" },
    { key: "updated_at", type: "number", label: "Updated at (Unix seconds)" },
  ],
  sample: {
    id: "basic-plan-usd-monthly",
    item_id: "basic-plan",
    name: "Basic plan USD monthly",
    currency_code: "USD",
    price: 1000,
    updated_at: 1762689600,
  },
});
