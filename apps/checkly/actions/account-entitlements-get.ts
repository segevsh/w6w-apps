import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";

/**
 * `GET /v1/accounts/me/entitlements` — verified against Checkly's OpenAPI
 * document (`getV1AccountsMeEntitlements`).
 *
 * **This reports the plan's allowance, not its consumption.** Each row is
 * `{key, name, type, enabled, quantity}`, where `type` is `flag` or `metered`
 * and `quantity` is documented as the *maximum* allowed. There is no usage
 * field anywhere in the document, which is why this app's `quota` health check
 * is a declared absence rather than a reading of this endpoint — treating
 * `quantity` as headroom would show a full allowance forever.
 *
 * It is still worth having: "can this account use private locations" and "how
 * many checks does the plan allow" are real questions with real answers here.
 */
const action: ActionDefinition = {
  key: "account-entitlements-get",
  type: "read",
  resource: "account",
  title: "Get plan entitlements",
  description: "What this account's plan allows — the maximums, not the usage.",
  params: [],
  output: [
    { key: "plan", type: "string", label: "Plan" },
    { key: "planDisplayName", type: "string", label: "Plan name" },
    {
      key: "entitlements",
      type: "array",
      label: "Per-feature allowances — `quantity` is the maximum, not what is left",
    },
    { key: "locations", type: "object", label: "Locations the plan may run from" },
    { key: "addons", type: "object", label: "Add-ons" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "getting Checkly plan entitlements", {});
    return await new ChecklyClient(ctx).request("/v1/accounts/me/entitlements");
  },
};

export default action;
