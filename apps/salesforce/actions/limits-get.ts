import type { ActionDefinition } from "@w6w/types";
import { SalesforceClient } from "../lib/client.ts";

/**
 * Worth checking before a bulk load: `DailyApiRequests` is the limit a runaway
 * workflow hits first, and hitting it locks the whole org out of the API for
 * the rest of the day.
 *
 * `health/quota.ts` asks `/limits` the same question. It is a separate hook
 * rather than a `healthCheck` tag on this Action because a promoted Action's
 * `execute` return value IS the health report, and this one returns Salesforce's
 * raw limits document — which carries no `state`, so the runtime would normalise
 * every result to `unknown`. The duplication is one `ctx.fetch` call and buys a
 * report the host can actually read.
 */
const limitsGet: ActionDefinition<Record<string, never>> = {
  key: "limits-get",
  type: "read",
  resource: "metadata",
  title: "Get Org Limits",
  description:
    "Read the org's API limits and current usage. `DailyApiRequests` is the one a bulk workflow hits first.",
  params: [],
  output: [
    { key: "DailyApiRequests", type: "object", label: "Daily API requests (Max / Remaining)" },
    { key: "DataStorageMB", type: "object", label: "Data storage" },
  ],

  execute(_input, ctx) {
    return new SalesforceClient(ctx).request("/limits");
  },
};

export default limitsGet;
