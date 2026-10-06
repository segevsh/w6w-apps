import type { ActionDefinition } from "@w6w/types";
import { CoinGeckoClient, str } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "get-trending",
  type: "read",
  resource: "search",
  title: "Get Trending",
  description:
    "The coins, NFTs and categories trending on CoinGecko right now (GET /search/trending).",
  params: [
    {
      key: "showMax",
      label: "Show max",
      type: "string",
      hint: "Comma-separated types to return the maximum for: coins, nfts, categories. " +
        "Larger result sets need a paid plan.",
    },
  ],
  output: [
    { key: "coins", type: "array", label: "Trending coins" },
    { key: "nfts", type: "array", label: "Trending NFTs" },
    { key: "categories", type: "array", label: "Trending categories" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new CoinGeckoClient(ctx).get("/search/trending", { show_max: str(p.showMax) });
  },
};

export default action;
