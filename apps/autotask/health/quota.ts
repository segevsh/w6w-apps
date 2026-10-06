/**
 * How much of this database's hourly API budget is left?
 *
 * Autotask caps a database at 10,000 external requests per rolling hour, counted across EVERY
 * integration on it, and adds latency as the count approaches the cap ("REST API supportability,
 * query thresholds, and latency"). `GET /ThresholdInformation` returns the ceiling and the
 * current count (`externalRequestThreshold`, `requestThresholdTimeframe`,
 * `currentTimeframeRequestCount`), so headroom is a real reading rather than a declared absence.
 *
 * Unlike the vendor's other limits there is no reset time in the response: the window is
 * rolling, so `resetAt` is deliberately omitted rather than invented.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { AutotaskClient } from "../lib/client.ts";

/** Fraction of the ceiling at which a warning is worth raising. */
export const WARN_FRACTION = 0.8;

interface Threshold {
  externalRequestThreshold?: number;
  requestThresholdTimeframe?: number;
  currentTimeframeRequestCount?: number;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Hourly API request budget",
  description: "Requests used against the database's rolling request threshold, from " +
    "GET /ThresholdInformation. The budget is shared by every integration on the database.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let client: AutotaskClient;
    try {
      client = new AutotaskClient(ctx);
    } catch (err) {
      return { state: "unknown", message: String((err as Error).message) };
    }
    let info: Threshold | undefined;
    try {
      info = await client.call<Threshold>("GET", "/ThresholdInformation");
    } catch (err) {
      return { state: "unknown", message: String((err as Error).message) };
    }
    const limit = info?.externalRequestThreshold;
    const used = info?.currentTimeframeRequestCount;
    if (typeof limit !== "number" || typeof used !== "number") {
      return { state: "unknown", message: "ThresholdInformation carried no threshold figures" };
    }
    if (limit <= 0) return { state: "ok", quota: [{ id: "requests", unit: "requests" }] };

    const remaining = Math.max(0, limit - used);
    const fraction = used / limit;
    const window = info?.requestThresholdTimeframe;
    const quotas = [{ id: "requests", limit, remaining, unit: "requests" }];
    if (fraction >= 1) {
      return {
        state: "degraded",
        message: `${used}/${limit} requests used in the current ${window ?? ""} window — ` +
          "Autotask throttles and then suspends API service at the ceiling",
        quota: quotas,
        ttlSeconds: 120,
      };
    }
    if (fraction >= WARN_FRACTION) {
      return {
        state: "degraded",
        message: `${used}/${limit} requests used (${Math.round(fraction * 100)}%)`,
        quota: quotas,
        ttlSeconds: 120,
      };
    }
    return { state: "ok", quota: quotas, ttlSeconds: 120 };
  },
};

export default quota;
