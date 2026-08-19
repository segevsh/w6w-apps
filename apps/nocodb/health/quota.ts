import type { HealthCheckDefinition } from "@w6w/types";
import { describeError, hostFromConnection, readRateLimit } from "../lib/client.ts";

/**
 * Rate-limit headroom, read from the headers NocoDB puts on every response.
 *
 * ## The budget is small enough to matter, and it is published
 *
 * Measured live:
 *
 *     x-ratelimit-limit: 60
 *     x-ratelimit-remaining: 57
 *     x-ratelimit-reset: 60
 *
 * Sixty requests a minute. That is small — small enough that a single workflow
 * paging through a table can spend it — so unlike most of the quota checks in
 * this pack, this one is worth running: the number is real, it is current, and
 * a workflow can be too big for it.
 *
 * ## The probe spends one of the sixty
 *
 * There is no way to read the headers without making a request, so this check
 * costs exactly one request from the budget it is measuring. That is why it
 * runs at most every two minutes, and why it uses the cheapest authenticated
 * endpoint there is.
 *
 * ## The window is per caller, and a workflow is one caller
 *
 * Which means several workflows sharing a connection share the sixty, and a
 * schedule that fires four of them at once has fifteen requests each. The
 * remaining count here is the whole connection's, not this check's.
 */
const check: HealthCheckDefinition = {
  key: "quota",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  title: "Rate-limit headroom",
  description:
    "Reads NocoDB's own `x-ratelimit-remaining`, which is a real and current number — and a " +
    "small one: 60 requests a minute per caller, shared by every workflow on this connection. " +
    "The probe itself spends one of them.",
  covers: ["quota"],
  severity: "degraded",
  minIntervalSeconds: 120,
  network: { allow: ["*"] },

  async check(_input, ctx) {
    let host: string;
    try {
      host = hostFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String(err) };
    }

    const started = Date.now();
    let res: Response;
    try {
      // The cheapest authenticated call — the headers are on every response.
      res = await ctx.fetch(`${host}/api/v2/meta/bases`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "unknown", message: `could not reach ${host}: ${String(err)}` };
    }
    const latencyMs = Date.now() - started;
    const rateLimit = readRateLimit(res.headers);

    if (res.status === 429) {
      return {
        state: "degraded",
        message: `the budget is exhausted — it refills in ${
          rateLimit.resetSeconds ?? 60
        } seconds. Every workflow on this connection shares one window`,
        latencyMs,
      };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { state: "unknown", message: describeError(res.status, text), latencyMs };
    }

    if (rateLimit.remaining === undefined || rateLimit.limit === undefined) {
      return {
        state: "unknown",
        message: "this deployment published no rate-limit headers — NocoDB's cloud does, and a " +
          "self-hosted instance behind a proxy that strips them does not",
        latencyMs,
      };
    }

    const share = rateLimit.remaining / Math.max(1, rateLimit.limit);
    const detail = `${rateLimit.remaining} of ${rateLimit.limit} requests left, refilling in ${
      rateLimit.resetSeconds ?? 60
    }s`;

    if (share <= 0.1) {
      return {
        state: "degraded",
        message: `${detail} — something on this connection is close to the ceiling, and the ` +
          "next caller to hit it gets a 429",
        latencyMs,
      };
    }
    if (share <= 0.25) {
      return { state: "degraded", message: `${detail} — worth watching`, latencyMs };
    }

    return { state: "ok", message: detail, latencyMs };
  },
};

export default check;
