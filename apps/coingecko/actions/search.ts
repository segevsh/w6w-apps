import type { ActionDefinition } from "@w6w/types";
import { CoinGeckoClient, req } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "search",
  type: "search",
  resource: "search",
  title: "Search",
  description: "Search coins, exchanges, categories and NFTs by name or symbol (GET /search).",
  params: [{ key: "query", label: "Query", type: "string", required: true, hint: "e.g. solana." }],
  output: [
    { key: "coins", type: "array", label: "Matching coins" },
    { key: "exchanges", type: "array", label: "Matching exchanges" },
    { key: "icos", type: "array", label: "Matching ICOs" },
    { key: "categories", type: "array", label: "Matching categories" },
    { key: "nfts", type: "array", label: "Matching NFTs" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new CoinGeckoClient(ctx).get("/search", { query: req(p.query, "query") });
  },
};

export default action;
