import type { HealthCheckDefinition } from "@w6w/types";
import { API_HOST, describeError, parseRateLimit } from "../lib/client.ts";

/**
 * How much of the hourly request budget is left.
 *
 * DigitalOcean is one of the few APIs in this pack that publishes a real,
 * account-wide rate limit and reports it on every authenticated response:
 * **5,000 requests an hour**, in `RateLimit-Limit`, `RateLimit-Remaining` and
 * `RateLimit-Reset`.
 *
 * ## `RateLimit-Reset` is a Unix timestamp, not a duration
 *
 * Unlike almost everything else here — where a reset is seconds from now — this
 * one is seconds since the epoch. Treating it as a delay produces a wait of
 * fifty-five years; treating a delay as a timestamp produces a date in 1970.
 * The check reports both the raw value and how far away it is.
 *
 * ## The headers are absent on a 401
 *
 * Verified: an unauthenticated request carries no rate-limit headers at all. So
 * a check that fails to authenticate learns nothing about headroom, and this
 * reports that as unknown rather than as exhausted.
 *
 * ## The budget is per token, and a workflow shares it with everything else
 *
 * Every automation, script and terminal using the same token draws on the same
 * 5,000. That is why headroom is worth watching here and not in most places: it
 * is genuinely shared, genuinely finite, and genuinely reported.
 */
const check: HealthCheckDefinition = {
  key: "quota",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  title: "Request budget",
  description:
    "Reads DigitalOcean's real hourly request budget — 5,000 per TOKEN, shared by every " +
    "automation using it. `RateLimit-Reset` is a Unix TIMESTAMP rather than a delay, which is " +
    "the opposite of most of this pack.",
  covers: ["quota"],
  severity: "informational",
  minIntervalSeconds: 300,
  network: { allow: ["api.digitalocean.com"] },

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_HOST}/v2/account`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach DigitalOcean: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    const rateLimit = parseRateLimit(res.headers);

    if (!res.ok) {
      return {
        state: res.status === 401 ? "unknown" : "degraded",
        message: res.status === 401
          ? `${
            describeError(res.status, text)
          }. Note the rate-limit headers are absent on a 401, ` +
            "so this says nothing about headroom either way"
          : describeError(res.status, text),
      };
    }

    if (rateLimit.remaining === undefined || rateLimit.limit === undefined) {
      return {
        state: "unknown",
        message: "DigitalOcean answered without rate-limit headers, which it normally sends on " +
          "every authenticated response",
      };
    }

    // Seconds since the epoch, not seconds from now.
    const resetsInSeconds = rateLimit.resetsAt === undefined
      ? undefined
      : Math.max(0, rateLimit.resetsAt - Math.floor(Date.now() / 1000));
    const window = resetsInSeconds === undefined
      ? ""
      : `, resetting in ${Math.ceil(resetsInSeconds / 60)} min`;

    const fraction = rateLimit.remaining / rateLimit.limit;
    const message = `${rateLimit.remaining} of ${rateLimit.limit} requests left this hour${window}`;

    if (rateLimit.remaining === 0) {
      return { state: "down", message: `${message} — further requests are being refused` };
    }
    if (fraction < 0.1) {
      return {
        state: "degraded",
        message: `${message}. The budget is per TOKEN, so everything sharing it is drawing on ` +
          "the same 5,000",
      };
    }
    return { state: "ok", message };
  },
};

export default check;
