import type { HealthCheckDefinition, HealthReport } from "@w6w/types";
import { API_BASE, failureMessage } from "../lib/client.ts";

/**
 * Is the Lodgify API answering **for this account**? — the signed probe.
 *
 * `GET /v2/properties?size=1` with the connection's key (injected by the auth `sign`
 * hook; this module never sees the header). Success is decided from the body — a
 * `{items: [...]}` page — not the status. A 401/403 is the documented "Authorization
 * has been denied" case (live it arrives with an empty body, so the status is the only
 * signal there) and reports `degraded`, not `down`: the API answered. A 429 is rate
 * limiting (docs: 600/min v1, 750/min v2), also `degraded`. Only an unreachable host or
 * a 5xx is `down`.
 */
const check: HealthCheckDefinition = {
  key: "api",
  kind: "dependency",
  scope: "connection",
  credential: "signed",
  title: "Lodgify API answering for this account",
  description: "Signed GET /v2/properties?size=1, classified from the response body.",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 300,

  async check(_input, ctx): Promise<HealthReport> {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/v2/properties?size=1`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return {
        state: "down",
        message: `could not reach ${new URL(API_BASE).host}: ${String(err)}`,
        latencyMs: Date.now() - started,
      };
    }
    const latencyMs = Date.now() - started;
    const text = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }

    if (Array.isArray((body as { items?: unknown } | undefined)?.items)) {
      return { state: "ok", latencyMs, ttlSeconds: 300 };
    }
    if (res.status === 429) {
      return { state: "degraded", message: "rate limited (HTTP 429)", latencyMs };
    }
    if (res.status === 401 || res.status === 403) {
      const detail = failureMessage(body);
      return {
        state: "degraded",
        message: `Lodgify rejected this connection's key (HTTP ${res.status}` +
          `${detail ? `: ${detail}` : ""})`,
        latencyMs,
      };
    }
    if (res.status >= 500) {
      return {
        state: "down",
        message: `Lodgify returned HTTP ${res.status}${
          failureMessage(body) ? `: ${failureMessage(body)}` : ""
        }`,
        latencyMs,
      };
    }
    return {
      state: "degraded",
      message: `unexpected response (HTTP ${res.status}): ${
        text.trim().slice(0, 200) || "no body"
      }`,
      latencyMs,
    };
  },
};

export default check;
