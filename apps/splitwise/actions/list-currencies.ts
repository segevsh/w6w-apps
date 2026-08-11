import type { ActionDefinition } from "@w6w/types";
import { pick, SplitwiseClient } from "../lib/client.ts";

/**
 * `GET /get_currencies` — the codes `currency_code` will accept.
 *
 * ## `requiresAuth: false`, measured rather than assumed
 *
 * This endpoint answers **HTTP 200 with its full payload and no credential at
 * all** (measured 2026-08-11 — the response opens
 * `{"currencies":[{"currency_code":"AED","unit":"DH"},…]`). It is one of
 * exactly two public endpoints in this API; `get_categories` is the other.
 *
 * Two consequences, and the second matters more:
 *
 *  1. Declaring `requiresAuth: false` is honest and useful — a workflow can
 *     validate a currency code before anyone has connected an account.
 *  2. **It must never be an auth probe.** A Connection whose key was dropped on
 *     the floor would pass a check against this endpoint every time. That is
 *     why `auth/api-key.ts` probes `get_current_user` instead, and why a test
 *     pins it there.
 *
 * ## The list is not plain ISO 4217
 *
 * > These are mostly ISO 4217 codes, but we do sometimes use pending codes or
 * > unofficial, colloquial codes (like BTC instead of XBT for Bitcoin).
 *
 * So a workflow that validates against an ISO table will reject codes Splitwise
 * accepts. Validate against this.
 */
const listCurrencies: ActionDefinition<Record<string, never>> = {
  key: "list-currencies",
  type: "read",
  resource: "reference",
  title: "List Currencies",
  description: "Every currency code Splitwise accepts, with its display unit.",
  requiresAuth: false,
  params: [],
  output: [{ key: "currencies", type: "array", label: "Currencies" }],

  async execute(_input, ctx) {
    const body = await new SplitwiseClient(ctx).request("/get_currencies");
    return { currencies: pick<unknown[]>(body, "currencies", []) };
  },
};

export default listCurrencies;
