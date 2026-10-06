import type { ActionDefinition } from "@w6w/types";
import { bool, CoinGeckoClient, req } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "get-coin-history",
  type: "read",
  resource: "coins",
  title: "Get Coin History",
  description:
    "A coin's price, market cap and volume snapshot on one date (GET /coins/{id}/history).",
  params: [
    { key: "id", label: "Coin ID", type: "string", required: true, hint: "e.g. bitcoin." },
    {
      key: "date",
      label: "Date",
      type: "string",
      required: true,
      hint: "Snapshot date as YYYY-MM-DD.",
      validation: { pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
    { key: "localization", label: "Include localized names", type: "boolean", default: true },
  ],
  output: [
    { key: "id", type: "string", label: "Coin ID" },
    { key: "market_data", type: "object", label: "Market data on that date" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = req(p.id, "id");
    return await new CoinGeckoClient(ctx).get(`/coins/${encodeURIComponent(id)}/history`, {
      date: req(p.date, "date"),
      localization: bool(p.localization),
    });
  },
};

export default action;
