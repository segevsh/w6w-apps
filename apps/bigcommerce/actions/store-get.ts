import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient } from "../lib/client.ts";

/**
 * `GET /v2/store` — the store's global settings.
 *
 * The current endpoint despite the v2 in its path: `/v2/store` is absent from
 * BigCommerce's Deprecations and Sunsets list, and "Store Information V3" is a
 * different resource entirely — it holds store *metafields*
 * (`/v3/store/metafields`), not the profile. There is no v3 replacement for this.
 *
 * Returns currency, weight and dimension units, the tax-inclusive-pricing flag,
 * timezone, plan name and level, the default channel and site ids, and a
 * `features` block — the settings that decide how every other number in the API
 * should be read. It needs the **Information & Settings** scope.
 *
 * It also returns `admin_email`, `order_email`, the owner's first and last name
 * and the account UUID, which is precisely why this endpoint is an Action a human
 * asked for and **not** the credential probe — see `auth/access-token.ts`. The
 * `store` health check reads only `status`, `plan_name` and `plan_is_trial` from
 * it.
 */
const storeGet: ActionDefinition<Record<string, never>> = {
  key: "store-get",
  type: "read",
  resource: "store",
  title: "Get Store Information",
  description:
    "The store's global settings — currency, units, tax-inclusive pricing, timezone, plan, and " +
    "the default channel and site IDs.",
  params: [],
  output: [
    { key: "name", type: "string", label: "Store name" },
    { key: "domain", type: "string", label: "Primary domain" },
    { key: "currency", type: "string", label: "Default currency code" },
    { key: "status", type: "string", label: "Store status" },
    { key: "plan_name", type: "string", label: "Plan" },
    { key: "is_price_entered_with_tax", type: "boolean", label: "Prices include tax" },
  ],

  execute(_input, ctx) {
    return new BigCommerceClient(ctx).v2("/store");
  },
};

export default storeGet;
