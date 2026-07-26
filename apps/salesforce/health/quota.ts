/**
 * How much headroom is left on THIS org — Salesforce.
 *
 * Annotation:
 *
 *   - `kind: "quota"`. Salesforce's `/limits` genuinely answers two questions at
 *     once — it needs a live session, so it also proves the credential works —
 *     but the derived `auth:*` checks already cover liveness, so this one is
 *     typed by the question it is being asked.
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the org behind the
 *     credential, and reading it needs the credential on the wire. Signing is
 *     safe because `/limits` is on the app's own egress allowlist
 *     (`*.salesforce.com`) — this check declares no `network.allow` of its own,
 *     which the spec forbids alongside a signed posture.
 *   - `severity: "informational"` — exhausting `DailyApiRequests` is serious,
 *     but headroom is context for a human rather than grounds for failing a
 *     roll-up verdict.
 *
 * `DailyApiRequests` is the limit that matters: a runaway bulk workflow hits it
 * first, and hitting it locks the WHOLE ORG out of the API for the rest of the
 * day — not just this connection. It is reported first for that reason.
 *
 * This duplicates the `limits-get` Action's call rather than tagging it with a
 * `healthCheck` block, because a promoted Action's `execute` return value is
 * used as the health report verbatim, and that Action returns Salesforce's raw
 * limits document — which has no `state` field.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { DATA_PATH } from "../lib/client.ts";

/** Every entry in `/limits` has this shape. */
interface Limit {
  Max?: number;
  Remaining?: number;
}

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
 * show why a bulk load is about to fail.
 */
const headroom = (l: Limit): HealthState => {
  if (l.Remaining === undefined) return "unknown";
  if (l.Remaining <= 0) return "down";
  if (l.Max !== undefined && l.Max > 0 && l.Remaining / l.Max < 0.1) return "degraded";
  return "ok";
};

/** The limits worth surfacing; everything else in `/limits` is noise here. */
const REPORTED = ["DailyApiRequests", "DailyBulkApiBatches", "DataStorageMB", "FileStorageMB"];

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Org API limits",
  description:
    "Daily API request allowance and storage headroom for this org, from `/limits`. Exhausting `DailyApiRequests` locks the whole org out of the API until midnight.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { instanceUrl?: string };
    const instance = display.instanceUrl?.replace(/\/+$/, "");
    if (!instance) return { state: "unknown", message: "connection records no instance URL" };

    const res = await ctx.fetch(`${instance}${DATA_PATH}/limits`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as Record<string, Limit>;
    const buckets: HealthQuota[] = [];
    for (const id of REPORTED) {
      const l = body[id];
      if (!l || typeof l.Remaining !== "number") continue;
      buckets.push({
        id,
        limit: l.Max,
        remaining: l.Remaining,
        unit: id.endsWith("MB") ? "megabytes" : "requests",
      });
    }
    if (buckets.length === 0) {
      return { state: "unknown", message: "`/limits` returned none of the expected entries" };
    }

    // Only the API-request limit gates the verdict: running low on file storage
    // is a real problem, but not one that stops a workflow from calling out.
    const daily = body.DailyApiRequests;
    return {
      state: daily ? headroom(daily) : "unknown",
      quota: buckets,
      ttlSeconds: 300,
    };
  },
};

export default quota;
