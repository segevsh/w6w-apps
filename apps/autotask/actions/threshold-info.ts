import type { ActionDefinition } from "@w6w/types";
import { AutotaskClient } from "../lib/client.ts";

/**
 * `GET /ThresholdInformation` — the database's API request budget.
 *
 * Autotask allows 10,000 external requests per rolling hour per database, counted across every
 * integration, and slows responses as the count nears it. A workflow that fans out (one query per
 * company) can read this first and stop early rather than starve the other integrations.
 */
const action: ActionDefinition = {
  key: "threshold-info",
  type: "read",
  resource: "account",
  title: "Get API request budget",
  description:
    "Requests used against the database's rolling hourly API threshold, shared by every " +
    "integration on the database.",
  params: [],
  output: [
    { key: "limit", type: "number", label: "Requests allowed in the window" },
    { key: "used", type: "number", label: "Requests counted so far" },
    { key: "remaining", type: "number", label: "Requests left" },
    { key: "timeframe", type: "number", label: "Window length as the API reports it" },
  ],

  async execute(_input, ctx) {
    const res = await new AutotaskClient(ctx).call<{
      externalRequestThreshold?: number;
      requestThresholdTimeframe?: number;
      currentTimeframeRequestCount?: number;
    }>("GET", "/ThresholdInformation");
    const limit = res?.externalRequestThreshold;
    const used = res?.currentTimeframeRequestCount;
    return {
      limit,
      used,
      remaining: typeof limit === "number" && typeof used === "number"
        ? Math.max(0, limit - used)
        : undefined,
      timeframe: res?.requestThresholdTimeframe,
    };
  },
};

export default action;
