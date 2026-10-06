import type { ActionDefinition } from "@w6w/types";
import { CoinGeckoClient, req, str } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "get-coin-market-chart",
  type: "read",
  resource: "coins",
  title: "Get Coin Market Chart",
  description:
    "Price, market-cap and volume time series for the last N days (GET /coins/{id}/market_chart). " +
    "Each series is [[unixMillis, value], ...]. Granularity is automatic unless `interval` is set.",
  params: [
    { key: "id", label: "Coin ID", type: "string", required: true, hint: "e.g. bitcoin." },
    { key: "vsCurrency", label: "Currency", type: "string", required: true, default: "usd" },
    {
      key: "days",
      label: "Days",
      type: "string",
      required: true,
      default: "7",
      hint: "Any integer number of days ago, or `max`.",
    },
    {
      key: "interval",
      label: "Interval",
      type: "select",
      options: [
        { value: "5m", label: "5 minutes" },
        { value: "hourly", label: "Hourly" },
        { value: "daily", label: "Daily" },
      ],
      hint: "Leave empty for automatic granularity. 1m/5m intervals are limited by plan.",
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
    return await new CoinGeckoClient(ctx).get(`/coins/${encodeURIComponent(id)}/market_chart`, {
      vs_currency: req(p.vsCurrency, "vsCurrency"),
      days: req(p.days, "days"),
      interval: str(p.interval),
      precision: str(p.precision),
    });
  },
};

export default action;
