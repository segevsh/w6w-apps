import type { ActionDefinition } from "@w6w/types";
import { EasyPostClient } from "../lib/client.ts";

/**
 * `GET /v2/carrier_accounts` — which carriers this account can actually use.
 *
 * The list that explains an empty `rates` array, which is the most confusing
 * outcome in the whole API: a shipment that rates against nothing looks like a
 * bad address and is usually a missing carrier account.
 *
 * Two distinctions worth knowing:
 *
 *   - EasyPost provides **default USPS access** to every account, so a new
 *     account rates against USPS and nothing else until carriers are added.
 *   - Adding a carrier means giving EasyPost **your own negotiated credentials**
 *     with that carrier, which is what makes the rates yours rather than list
 *     price.
 *
 * Rating considers at most **60 carrier accounts** and silently uses the first
 * sixty beyond that, so this action reports the count where it can be seen.
 *
 * Carrier credentials are never returned — EasyPost redacts them — which is
 * what makes this safe to run on a schedule.
 */
const action: ActionDefinition = {
  key: "carrier-account-list",
  type: "read",
  resource: "carrier-account",
  title: "List carrier accounts",
  description:
    "Which carriers this account can rate against — the usual explanation for an empty rates " +
    "array. Credentials are redacted by EasyPost, so this is safe to schedule.",
  params: [],
  output: [
    { key: "carrierAccounts", type: "array", label: "Carrier accounts" },
    { key: "count", type: "number", label: "How many are configured" },
    { key: "carriers", type: "array", label: "The carrier names, for a quick read" },
    { key: "overRatingLimit", type: "boolean", label: "More than the 60 rating considers" },
  ],

  async execute(_input, ctx) {
    const accounts = await new EasyPostClient(ctx).request<
      Array<{ type?: string; readable?: string }>
    >("/carrier_accounts");
    const list = Array.isArray(accounts) ? accounts : [];

    return {
      carrierAccounts: list,
      count: list.length,
      carriers: list.map((a) => String(a?.readable ?? a?.type ?? "")).filter(Boolean),
      // Rating silently uses the first 60 rather than failing.
      overRatingLimit: list.length > 60,
    };
  },
};

export default action;
