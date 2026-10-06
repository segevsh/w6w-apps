import type { ActionDefinition } from "@w6w/types";
import { CoinGeckoClient, req, str } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "get-coin-market-chart-range",
  type: "read",
  resource: "coins",
  title: "Get Coin Market Chart (Range)",
  description: "Price, market-cap and volume time series between two dates " +
    "(GET /coins/{id}/market_chart/range). Each series is [[unixMillis, value], ...].",
  params: [
    { key: "id", label: "Coin ID", type: "string", required: true, hint: "e.g. bitcoin." },
    { key: "vsCurrency", label: "Currency", type: "string", required: true, default: "usd" },
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      hint: "ISO date (YYYY-MM-DD or YYYY-MM-DDTHH:MM) or UNIX seconds. CoinGecko recommends ISO.",
    },
    { key: "to", label: "To", type: "string", required: true, hint: "Same formats as From." },
    {
      key: "interval",
      label: "Interval",
      type: "select",
      options: [
        { value: "5m", label: "5 minutes" },
        { value: "hourly", label: "Hourly" },
        { value: "daily", label: "Daily" },
      ],
      hint: "Leave empty for automatic granularity.",
    },
    { key: "precision", label: "Decimal places", type: "string", hint: "`full` or 0-18." },
  ],
  output: [
    { key: "prices", type: "array", label: "[timestamp, price] pairs" },
    { key: "market_caps", type: "array", label: "[timestamp, market cap] pairs" },
    { key: "total_volumes", type: "array", label: "[timestamp, volume] pairs" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = req(p.id, "id");
    return await new CoinGeckoClient(ctx).get(
      `/coins/${encodeURIComponent(id)}/market_chart/range`,
      {
        vs_currency: req(p.vsCurrency, "vsCurrency"),
        from: req(p.from, "from"),
        to: req(p.to, "to"),
        interval: str(p.interval),
        precision: str(p.precision),
      },
    );
  },
};

export default action;
