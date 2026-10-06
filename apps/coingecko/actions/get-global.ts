import type { ActionDefinition } from "@w6w/types";
import { CoinGeckoClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "get-global",
  type: "read",
  resource: "global",
  title: "Get Global Market Data",
  description:
    "Whole-market statistics: active coins, total market cap and volume by currency, dominance " +
    "(GET /global). The vendor wraps the payload in `data`; it is returned as-is.",
  params: [],
  output: [{ key: "data", type: "object", label: "Global market statistics" }],

  async execute(_input, ctx) {
    return await new CoinGeckoClient(ctx).get("/global");
  },
};

export default action;
