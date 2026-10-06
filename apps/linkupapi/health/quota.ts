import type { HealthCheckDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance",
  description: "Credits remaining, from GET /v2/credits. Free to call. Per-seat plans are " +
    "unmetered; the balance still reads but is not a limit there.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    let credits: unknown;
    try {
      const out = await new LinkupApiClient(ctx).request("GET", "/v2/credits");
      credits = (out.data as { credits?: unknown } | null)?.credits;
    } catch (err) {
      return { state: "unknown", message: err instanceof Error ? err.message : String(err) };
    }
    if (typeof credits !== "number") {
      return { state: "unknown", message: "the credits endpoint did not return a number" };
    }
    const quota = [{ id: "credits", remaining: credits, unit: "credits" }];
    if (credits <= 0) return { state: "down", message: "no credits left", quota, ttlSeconds: 900 };
    return { state: "ok", quota, ttlSeconds: 900 };
  },
};

export default quota;
