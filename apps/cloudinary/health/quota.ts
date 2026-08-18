/**
 * Two ceilings, and they are not the same ceiling.
 *
 * Cloudinary meters an account twice over, and a workflow can hit either:
 *
 *   - **API requests per hour** — 500 on the free plan, from 2,000 on paid
 *     ones. Reported on every authenticated response as
 *     `X-FeatureRateLimit-Limit`, `-Remaining` and `-Reset`. This is the one
 *     that stops a batch job mid-run, and it refills on the hour rather than
 *     continuously.
 *   - **Plan credits** — the monthly budget that transformations, storage and
 *     bandwidth all draw down. Running out does not throttle the API; it
 *     changes the bill, or stops delivery, depending on the plan.
 *
 * `GET /usage` is the one call that reports both: the headers come back with
 * it like any other request, and the body carries the credit and storage
 * figures. Both are reported as separate quota entries so a host can tell
 * "you are about to be throttled" from "you are about to be invoiced".
 *
 * The body's shape is read **defensively**. Cloudinary publishes no schema for
 * it, and the fields differ by plan — an account on a legacy plan reports
 * transformations, storage and bandwidth separately while a credits-based one
 * reports `credits.{usage,limit}`. Anything recognisable is reported; anything
 * else is skipped rather than guessed at.
 *
 * `severity: "informational"` because headroom is a capacity fact rather than
 * an outage.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { CloudinaryClient } from "../lib/client.ts";

/** Below this fraction of a bucket, say so. */
const LOW_WATER = 0.1;

interface UsageBody {
  plan?: string;
  credits?: { usage?: number; limit?: number; used_percent?: number };
  storage?: { usage?: number; limit?: number };
  bandwidth?: { usage?: number; limit?: number };
  transformations?: { usage?: number; limit?: number };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API and plan headroom",
  description:
    "Cloudinary's hourly API request allowance, read from the rate-limit headers, and the " +
    "plan's credit budget from GET /usage. Being throttled and being over budget are different " +
    "problems.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const client = new CloudinaryClient(ctx);
    const res = await ctx.fetch(`${client.base}/usage`, {
      headers: { accept: "application/json" },
    });

    const num = (name: string): number | undefined => {
      const raw = res.headers.get(name);
      if (raw === null || raw.trim() === "") return undefined;
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    };
    const limit = num("x-featureratelimit-limit");
    const remaining = num("x-featureratelimit-remaining");
    const reset = res.headers.get("x-featureratelimit-reset");

    if (!res.ok) {
      return { state: "unknown", message: `GET /usage returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as UsageBody | null;

    const quotas: HealthQuota[] = [];
    const parts: string[] = [];
    let low = false;

    if (limit !== undefined && remaining !== undefined) {
      quotas.push({
        id: "api-requests",
        limit,
        remaining,
        unit: "requests",
        // An RFC-1123 date here, not epoch seconds — parsed rather than
        // multiplied.
        resetAt: reset ? isoOrUndefined(reset) : undefined,
      });
      parts.push(`${remaining}/${limit} API requests this hour`);
      if (remaining <= 0 || remaining / Math.max(1, limit) < LOW_WATER) low = true;
    }

    // Credits are the money ceiling. Present only on credit-based plans.
    const credits = body?.credits;
    if (credits && typeof credits.limit === "number" && typeof credits.usage === "number") {
      const creditsLeft = Math.max(0, credits.limit - credits.usage);
      quotas.push({ id: "credits", limit: credits.limit, remaining: creditsLeft, unit: "credits" });
      parts.push(`${creditsLeft.toFixed(2)}/${credits.limit} credits`);
      if (credits.limit > 0 && creditsLeft / credits.limit < LOW_WATER) low = true;
    }

    for (
      const [id, bucket] of [
        ["storage", body?.storage],
        ["bandwidth", body?.bandwidth],
        ["transformations", body?.transformations],
      ] as Array<[string, { usage?: number; limit?: number } | undefined]>
    ) {
      if (!bucket || typeof bucket.limit !== "number" || typeof bucket.usage !== "number") continue;
      quotas.push({
        id,
        limit: bucket.limit,
        remaining: Math.max(0, bucket.limit - bucket.usage),
        unit: id === "transformations" ? "transformations" : "bytes",
      });
    }

    if (quotas.length === 0) {
      return {
        state: "unknown",
        message: "Cloudinary sent neither rate-limit headers nor a recognisable usage body",
      };
    }

    const message = `${parts.join(" · ")}${body?.plan ? ` (${body.plan})` : ""}`;
    if (low) return { state: "degraded", message: `running low — ${message}`, quota: quotas };
    return { state: "ok", message, quota: quotas, ttlSeconds: 300 };
  },
};

/** Cloudinary's reset header is a date string; anything unparseable is dropped. */
function isoOrUndefined(raw: string): string | undefined {
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

export default quota;
