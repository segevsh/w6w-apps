import type { ActionDefinition } from "@w6w/types";
import { HctiClient } from "../lib/client.ts";

/**
 * `GET /v1/usage` — images created, by hour (72), day (60), month (12) and billing period.
 *
 * Needs `usage:read`. Returns `{data: {hour, day, month}, per_billing_period: [{total_images,
 * start, end}]}`; each time series maps an interval-start ISO timestamp to a count. There is
 * no plan ceiling in the response, so this reads consumption, never headroom. Also the
 * connection's credential probe (`auth/basic.ts`). `skipCache` bypasses the vendor's cached
 * figures.
 */
interface Input {
  skipCache?: boolean;
}

const usageGet: ActionDefinition<Input> = {
  key: "usage-get",
  type: "read",
  resource: "usage",
  title: "Get Usage",
  description: "Read images created per hour, day, month and billing period.",
  params: [
    {
      key: "skipCache",
      label: "Skip cache",
      type: "boolean",
      hint: "Ask the vendor for fresh figures instead of cached ones.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Counts keyed by hour, day and month" },
    { key: "per_billing_period", type: "array", label: "{total_images, start, end} per period" },
  ],

  execute(input, ctx) {
    return new HctiClient(ctx).json("/usage", {
      query: { skipCache: input.skipCache === true ? "true" : undefined },
    });
  },
};

export default usageGet;
