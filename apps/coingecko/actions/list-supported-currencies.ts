import type { ActionDefinition } from "@w6w/types";
import { CoinGeckoClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-supported-currencies",
  type: "read",
  resource: "prices",
  title: "List Supported Currencies",
  description:
    "Every currency code accepted as a target currency (GET /simple/supported_vs_currencies).",
  params: [],
  output: [{ key: "currencies", type: "array", label: "Currency codes" }],

  async execute(_input, ctx) {
    const currencies = await new CoinGeckoClient(ctx).get("/simple/supported_vs_currencies");
    return { currencies };
  },
};

export default action;
