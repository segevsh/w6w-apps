import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient } from "../lib/client.ts";

/** `GET /v1/account` — Fetch the account: id, default currency, company name and creation time. */
type Input = Record<string, never>;

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch the account: id, default currency, company name and creation time.",
  params: [],
  output: [
    { key: "account", type: "object", label: "The account" },
  ],

  execute(_input, ctx) {
    return new BaremetricsClient(ctx).request("GET", "/account");
  },
};

export default accountGet;
