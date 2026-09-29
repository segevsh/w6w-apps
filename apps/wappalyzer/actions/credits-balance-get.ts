import type { ActionDefinition } from "@w6w/types";
import { PATHS, WappalyzerClient } from "../lib/client.ts";
import { creditsOutputFields } from "../lib/params.ts";

/**
 * `GET /v2/credits/balance/` — the account's remaining credit balance.
 *
 * Verified against `getCreditBalance` in Wappalyzer's OpenAPI contract
 * (fetched 2026-09-29). Unlike every other endpoint in this app, the Basics
 * page lists no "Pricing" row for it — it does not spend credits — which is
 * also why `auth/api-key.ts` uses it as the connection-liveness probe.
 */
type Input = Record<string, never>;

interface CreditsBalance {
  credits: number;
}

const creditsBalanceGet: ActionDefinition<Input> = {
  key: "credits-balance-get",
  type: "read",
  resource: "credits",
  title: "Get Credit Balance",
  description: "Check the account's remaining credit balance without spending any credits.",
  params: [],
  output: [
    { key: "credits", type: "number", label: "Credits remaining" },
    ...creditsOutputFields,
  ],

  async execute(_input, ctx) {
    const client = new WappalyzerClient(ctx);
    const { data, creditsSpent, creditsRemaining } = await client.get<CreditsBalance>(
      PATHS.creditsBalance,
    );
    return { credits: data?.credits, creditsSpent, creditsRemaining };
  },
};

export default creditsBalanceGet;
