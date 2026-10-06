import type { ActionDefinition } from "@w6w/types";
import { CoinGeckoClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "ping",
  type: "read",
  resource: "server",
  title: "Ping",
  description: "Check that the CoinGecko API server is up (GET /ping).",
  params: [],
  output: [{ key: "gecko_says", type: "string", label: "Server greeting" }],

  async execute(_input, ctx) {
    return await new CoinGeckoClient(ctx).get("/ping");
  },
};

export default action;
