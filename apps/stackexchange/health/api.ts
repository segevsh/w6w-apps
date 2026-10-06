/**
 * Is the Stack Exchange API answering? An unsigned reachability probe.
 *
 * `GET /2.3/info?site=stackoverflow` needs no credential (measured 2026-10-06: HTTP 200, a
 * wrapper with `quota_max` 300 and `items[0].total_questions`). A healthy answer is therefore a
 * schema-correct 200 wrapper; an HTML 200 or a bare status is never mistaken for it. The API's
 * `throttle_violation` (502) and `temporarily_unavailable` (503) errors, and any 5xx, mean down.
 * Whether the key is good is the derived `auth:api-key` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, type Wrapper } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of /info?site=stackoverflow. A wrapper object with network statistics is the healthy answer; key validity is the `auth:api-key` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/info?site=stackoverflow`, {
        headers: { accept: "application/json" },
      });
    } catch (e) {
      return { state: "down", message: `could not reach ${API_BASE}: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: (Wrapper & { error_name?: unknown; error_message?: unknown }) | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* a non-JSON body is itself the finding */ }

    if (res.status >= 500) {
      const name = typeof body?.error_name === "string" ? `: ${body.error_name}` : "";
      return { state: "down", message: `API returned ${res.status}${name}` };
    }
    const first = body?.items?.[0] as { total_questions?: unknown } | undefined;
    if (res.ok && typeof first?.total_questions === "number") {
      if (typeof body?.backoff === "number") {
        return {
          state: "degraded",
          message: `API answered but asked callers to back off ${body.backoff}s`,
          ttlSeconds: 60,
        };
      }
      return { state: "ok", message: "API answered with the documented wrapper", ttlSeconds: 60 };
    }
    return {
      state: "degraded",
      message: `API returned an unexpected ${res.status}: ${
        typeof body?.error_message === "string" ? body.error_message : raw.slice(0, 120)
      }`,
    };
  },
};

export default api;
