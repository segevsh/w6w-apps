import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Kudosity publishes no status page: `status.kudosity.com` does not resolve and the developer
 * docs link to none. The signal left is the gateway itself. An unsigned `GET /v2/webhook`
 * answers `401 {"status":"Invalid api key"}` (measured 2026-10-06), a schema-correct refusal
 * that proves the API is serving; credential validity is the derived `auth:api-key` check's job.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Kudosity API reachability",
  description: `Unsigned GET ${API_BASE}${API_PREFIX}/webhook. A 401 carrying the gateway's own ` +
    '`{"status": "..."}` body passes. Kudosity publishes no status page.',
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${API_PREFIX}/webhook`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `could not reach api.transmitmessage.com: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    let body: { status?: unknown } | undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }

    if (res.status >= 500) {
      return { state: "down", message: `Kudosity API answered ${res.status}`, ttlSeconds: 60 };
    }
    if ((res.status === 401 || res.status === 403) && typeof body?.status === "string") {
      return { state: "ok", ttlSeconds: 60 };
    }
    if (res.status === 200) {
      return { state: "unknown", message: "unsigned probe unexpectedly returned 200" };
    }
    return {
      state: "unknown",
      message: `unsigned probe returned ${res.status} without a recognisable error body`,
    };
  },
};

export default service;
