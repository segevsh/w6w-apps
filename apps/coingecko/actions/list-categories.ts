import type { ActionDefinition } from "@w6w/types";
import { CoinGeckoClient, str } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-categories",
  type: "read",
  resource: "categories",
  title: "List Categories (with Market Data)",
  description: "Coin categories with market cap, 24h change and volume (GET /coins/categories).",
  params: [
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "market_cap_desc", label: "Market cap, high to low (default)" },
        { value: "market_cap_asc", label: "Market cap, low to high" },
        { value: "name_desc", label: "Name, Z-A" },
        { value: "name_asc", label: "Name, A-Z" },
        { value: "market_cap_change_24h_desc", label: "24h market-cap change, high to low" },
        { value: "market_cap_change_24h_asc", label: "24h market-cap change, low to high" },
      ],
    },
  ],
  output: [{ key: "categories", type: "array", label: "Categories with market data" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const categories = await new CoinGeckoClient(ctx).get("/coins/categories", {
      order: str(p.order),
    });
    return { categories };
  },
};

export default action;
