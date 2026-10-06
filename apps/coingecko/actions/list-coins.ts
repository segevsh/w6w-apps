import type { ActionDefinition } from "@w6w/types";
import { bool, CoinGeckoClient, str } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-coins",
  type: "read",
  resource: "coins",
  title: "List Coins",
  description:
    "Every coin CoinGecko tracks, as {id, symbol, name} (GET /coins/list). The id is what the " +
    "other actions take. The full list is large — thousands of entries.",
  params: [
    { key: "includePlatform", label: "Include contract addresses", type: "boolean" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "active", label: "Active (default)" }, {
        value: "inactive",
        label: "Inactive",
      }],
    },
  ],
  output: [{ key: "coins", type: "array", label: "Coins: id, symbol, name (and platforms)" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const coins = await new CoinGeckoClient(ctx).get("/coins/list", {
      include_platform: bool(p.includePlatform),
      status: str(p.status),
    });
    return { coins };
  },
};

export default action;
