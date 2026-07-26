import type { ActionDefinition } from "@w6w/types";
import { SalesforceClient } from "../lib/client.ts";

/**
 * Worth checking before a bulk load: `DailyApiRequests` is the limit a runaway
 * workflow hits first, and hitting it locks the whole org out of the API for
 * the rest of the day.
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
