import type { ActionDefinition } from "@w6w/types";
import { bool, CoinGeckoClient, req, str } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "get-coin",
  type: "read",
  resource: "coins",
  title: "Get Coin",
  description:
    "Full profile for one coin: metadata, links, market data and tickers (GET /coins/{id}). " +
    "The response is large — switch off the sections you do not need.",
  params: [
    { key: "id", label: "Coin ID", type: "string", required: true, hint: "e.g. bitcoin." },
    { key: "localization", label: "Include localized names", type: "boolean", default: true },
    { key: "tickers", label: "Include tickers", type: "boolean", default: true },
    { key: "marketData", label: "Include market data", type: "boolean", default: true },
    { key: "sparkline", label: "Include 7-day sparkline", type: "boolean" },
    { key: "includeCategoriesDetails", label: "Include category details", type: "boolean" },
    {
      key: "dexPairFormat",
      label: "DEX pair format",
      type: "select",
      options: [
        { value: "contract_address", label: "Contract address (default)" },
        { value: "symbol", label: "Symbol" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Coin ID" },
    { key: "symbol", type: "string", label: "Symbol" },
    { key: "name", type: "string", label: "Name" },
    { key: "market_data", type: "object", label: "Market data" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = req(p.id, "id");
    return await new CoinGeckoClient(ctx).get(`/coins/${encodeURIComponent(id)}`, {
      localization: bool(p.localization),
      tickers: bool(p.tickers),
      market_data: bool(p.marketData),
      sparkline: bool(p.sparkline),
      include_categories_details: bool(p.includeCategoriesDetails),
      dex_pair_format: str(p.dexPairFormat),
    });
  },
};

export default action;
