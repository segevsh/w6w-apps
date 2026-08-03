import type { ActionDefinition } from "@w6w/types";
import { KitClient } from "../lib/client.ts";

const getAccount: ActionDefinition<Record<string, never>> = {
  key: "get-account",
  type: "read",
  resource: "account",
  title: "Get Account",
  description:
    "Return the authenticated account and user: id, name, plan type, primary email, timezone, and the account's sending addresses with verification and DMARC status.",
  params: [],
  output: [
    { key: "user", type: "object", label: "Authenticated user" },
    { key: "account", type: "object", label: "Account" },
  ],

  execute(_input, ctx) {
    return new KitClient(ctx).request("/account");
  },
};

export default getAccount;
