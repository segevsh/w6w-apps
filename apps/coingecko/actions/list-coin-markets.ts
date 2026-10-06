import type { ActionDefinition } from "@w6w/types";
import { bool, CoinGeckoClient, csv, num, req, str } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-coin-markets",
  type: "read",
  resource: "coins",
  title: "List Coin Markets",
  description: "Coins with price, market cap, volume and 24h change in a target currency, ranked " +
    "(GET /coins/markets). Page through with `page` and `perPage`.",
  params: [
    { key: "vsCurrency", label: "Currency", type: "string", required: true, default: "usd" },
    { key: "ids", label: "Coin IDs", type: "string", hint: "Comma-separated; omit for all." },
    { key: "names", label: "Coin names", type: "string" },
    { key: "symbols", label: "Coin symbols", type: "string" },
    {
      key: "includeTokens",
      label: "Include tokens (symbol lookups)",
      type: "select",
      options: [{ value: "top", label: "Top" }, { value: "all", label: "All" }],
    },
    {
      key: "category",
      label: "Category",
      type: "string",
      hint: "A category_id from List Category IDs.",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "market_cap_desc", label: "Market cap, high to low (default)" },
        { value: "market_cap_asc", label: "Market cap, low to high" },
        { value: "volume_desc", label: "Volume, high to low" },
        { value: "volume_asc", label: "Volume, low to high" },
        { value: "id_asc", label: "ID, A-Z" },
        { value: "id_desc", label: "ID, Z-A" },
      ],
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 100,
      validation: { min: 1, max: 250, integer: true },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { min: 1, integer: true },
    },
    { key: "sparkline", label: "Include 7-day sparkline", type: "boolean" },
    {
      key: "priceChangePercentage",
      label: "Price-change windows",
      type: "string",
      hint: "Comma-separated: 1h, 24h, 7d, 14d, 30d, 200d, 1y.",
    },
    { key: "locale", label: "Language", type: "string", hint: "e.g. en, de, ja, zh-tw." },
    { key: "precision", label: "Decimal places", type: "string", hint: "`full` or 0-18." },
  ],
  output: [{ key: "coins", type: "array", label: "Coins with market data" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const coins = await new CoinGeckoClient(ctx).get("/coins/markets", {
      vs_currency: req(p.vsCurrency, "vsCurrency"),
      ids: csv(p.ids),
      names: csv(p.names),
      symbols: csv(p.symbols),
      include_tokens: str(p.includeTokens),
      category: str(p.category),
      order: str(p.order),
      per_page: num(p.perPage),
      page: num(p.page),
      sparkline: bool(p.sparkline),
      price_change_percentage: csv(p.priceChangePercentage),
      locale: str(p.locale),
      precision: str(p.precision),
    });
    return { coins };
  },
};

export default action;
