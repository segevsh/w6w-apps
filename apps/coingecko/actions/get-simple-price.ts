import type { ActionDefinition } from "@w6w/types";
import { bool, CoinGeckoClient, csv, req, str } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "get-simple-price",
  type: "read",
  resource: "prices",
  title: "Get Coin Prices",
  description:
    "Current price of one or more coins in one or more currencies (GET /simple/price). " +
    "Identify coins by id (preferred), name, or symbol.",
  params: [
    {
      key: "vsCurrencies",
      label: "Currencies",
      type: "string",
      required: true,
      default: "usd",
      hint: "Comma-separated target currencies, e.g. usd,eur,btc.",
    },
    {
      key: "ids",
      label: "Coin IDs",
      type: "string",
      hint: "Comma-separated CoinGecko ids, e.g. bitcoin,ethereum. Find ids with List Coins.",
    },
    { key: "names", label: "Coin names", type: "string", hint: "Comma-separated, e.g. Bitcoin." },
    {
      key: "symbols",
      label: "Coin symbols",
      type: "string",
      hint: "Comma-separated, e.g. btc,eth.",
    },
    {
      key: "includeTokens",
      label: "Include tokens (symbol lookups)",
      type: "select",
      options: [{ value: "top", label: "Top-ranked only (default)" }, {
        value: "all",
        label: "All",
      }],
    },
    { key: "includeMarketCap", label: "Include market cap", type: "boolean" },
    { key: "include24hrVol", label: "Include 24h volume", type: "boolean" },
    { key: "include24hrChange", label: "Include 24h change", type: "boolean" },
    { key: "includeLastUpdatedAt", label: "Include last-updated time", type: "boolean" },
    {
      key: "precision",
      label: "Decimal places",
      type: "string",
      hint: "`full` or 0-18.",
    },
  ],
  output: [{ key: "prices", type: "object", label: "Map of coin id to {currency: price, ...}" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ids = csv(p.ids), names = csv(p.names), symbols = csv(p.symbols);
    if (!ids && !names && !symbols) {
      throw new Error("one of `ids`, `names` or `symbols` is required");
    }
    const prices = await new CoinGeckoClient(ctx).get("/simple/price", {
      vs_currencies: csv(req(p.vsCurrencies, "vsCurrencies")),
      ids,
      names,
      symbols,
      include_tokens: str(p.includeTokens),
      include_market_cap: bool(p.includeMarketCap),
      include_24hr_vol: bool(p.include24hrVol),
      include_24hr_change: bool(p.include24hrChange),
      include_last_updated_at: bool(p.includeLastUpdatedAt),
      precision: str(p.precision),
    });
    return { prices };
  },
};

export default action;
