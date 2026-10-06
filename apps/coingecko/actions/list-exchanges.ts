import type { ActionDefinition } from "@w6w/types";
import { CoinGeckoClient, num } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-exchanges",
  type: "read",
  resource: "exchanges",
  title: "List Exchanges",
  description: "Exchanges with trust score and 24h BTC volume, paged (GET /exchanges).",
  params: [
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
  ],
  output: [{ key: "exchanges", type: "array", label: "Exchanges" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const exchanges = await new CoinGeckoClient(ctx).get("/exchanges", {
      per_page: num(p.perPage),
      page: num(p.page),
    });
    return { exchanges };
  },
};

export default action;
