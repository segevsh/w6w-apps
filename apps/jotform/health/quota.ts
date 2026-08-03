/**
 * How much headroom is left on THIS credential — Jotform.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: Jotform meters the daily API allowance per ACCOUNT
 *     (every key on an account shares one budget), and reading it needs the
 *     credential on the wire.
 *   - No `network.allow` of its own — the three Jotform API hosts are already
 *     on the app's egress allowlist, which is what makes signing this probe
 *     safe. The spec forbids widening egress alongside a signed posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /user/usage`. Unlike most vendors in this pack Jotform publishes
 * a real, readable counter, and this one endpoint carries BOTH halves of the
 * daily budget in a single call:
 *
 *   - `content.api`   — API calls used today
 *   - `limit-left`    — API calls still available today (on the envelope, and
 *                       present on every Jotform response)
 *
 * so the plan's daily ceiling is `used + remaining` and needs no second call to
 * `/system/plan/{plan}`. Both fields verified against the vendor's own response
 * sample at api.jotform.com/docs (fetched 2026-08-03): "api: Number of api
 * calls used today. limit-left is the number of daily api calls you can make."
 *
 * `resetAt` is deliberately left unset. Jotform documents that the allowance
 * "resets daily" but does not publish the instant it rolls over, and inventing
 * one would be worse than omitting it.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl, hostFromConnection } from "../lib/client.ts";

const num = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
 * show why a workflow is about to start failing.
 */
const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Daily API call headroom",
  description:
    "Daily API call allowance remaining, read from `limit-left` and `content.api` on a GET /user/usage call.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const host = hostFromConnection(ctx.connection);
    const res = await ctx.fetch(`${baseUrl(host)}/user/usage`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      content?: Record<string, unknown>;
      "limit-left"?: unknown;
    };

    const remaining = num(body["limit-left"]);
    const used = num(body.content?.api);
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no `limit-left` field" };
    }
    const limit = used === undefined ? undefined : used + remaining;

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "daily",
        limit,
        remaining,
        unit: "requests",
      }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
