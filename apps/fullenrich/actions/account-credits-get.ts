import type { ActionDefinition } from "@w6w/types";
import { FullEnrichClient } from "../lib/client.ts";

/** `GET /account/credits` — the balance this key can spend (capped by its consumption limit). */
const accountCreditsGet: ActionDefinition<Record<string, never>> = {
  key: "account-credits-get",
  type: "read",
  resource: "account",
  title: "Get Credit Balance",
  description:
    "Return the credits this API key can currently spend: the workspace balance, or what remains under the key's consumption limit if that is lower.",
  params: [],
  output: [{ key: "balance", type: "number", label: "Spendable credits" }],

  async execute(_input, ctx) {
    const res = await new FullEnrichClient(ctx).request<{ balance?: number }>(
      "GET",
      "/account/credits",
    );
    return { balance: res.balance ?? null };
  },
};

export default accountCreditsGet;
