import type { ActionDefinition } from "@w6w/types";
import { CoinGeckoClient, req, str } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "get-coin-ohlc",
  type: "read",
  resource: "coins",
  title: "Get Coin OHLC",
  description:
    "Open/high/low/close candles for the last N days (GET /coins/{id}/ohlc). Candle width is " +
    "chosen by CoinGecko from `days` unless `interval` is set.",
  params: [
    { key: "id", label: "Coin ID", type: "string", required: true, hint: "e.g. bitcoin." },
    { key: "vsCurrency", label: "Currency", type: "string", required: true, default: "usd" },
    {
      key: "days",
      label: "Days",
      type: "select",
      required: true,
      default: "7",
      options: ["1", "7", "14", "30", "90", "180", "365", "max"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      key: "interval",
      label: "Interval",
      type: "select",
      options: [{ value: "daily", label: "Daily" }, { value: "hourly", label: "Hourly" }],
    },
    { key: "precision", label: "Decimal places", type: "string", hint: "`full` or 0-18." },
  ],
  output: [{ key: "candles", type: "array", label: "[timestamp, open, high, low, close] rows" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = req(p.id, "id");
    const candles = await new CoinGeckoClient(ctx).get(`/coins/${encodeURIComponent(id)}/ohlc`, {
      vs_currency: req(p.vsCurrency, "vsCurrency"),
      days: req(p.days, "days"),
      interval: str(p.interval),
      precision: str(p.precision),
    });
    return { candles };
  },
};

export default action;
