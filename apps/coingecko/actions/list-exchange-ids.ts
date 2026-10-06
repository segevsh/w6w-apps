import type { ActionDefinition } from "@w6w/types";
import { CoinGeckoClient, str } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-exchange-ids",
  type: "read",
  resource: "exchanges",
  title: "List Exchange IDs",
  description: "Every exchange as {id, name} (GET /exchanges/list).",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "active", label: "Active (default)" }, {
        value: "inactive",
        label: "Inactive",
      }],
    },
  ],
  output: [{ key: "exchanges", type: "array", label: "Exchanges: id, name" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const exchanges = await new CoinGeckoClient(ctx).get("/exchanges/list", {
      status: str(p.status),
    });
    return { exchanges };
  },
};

export default action;
