/**
 * Is Rendex up?
 *
 * ## No machine-readable status feed (checked 2026-10-06)
 *
 * `rendex.dev/status` is a real page (Rendering API, Dashboard, MCP Server, Watch, Database,
 * Billing) but a Next.js render with no feed: `/status.json`, `/api/status`,
 * `/api/v1/status` and `/status/feed.xml` all answer the same 200 HTML shell, and there is no
 * Atlassian/Better Stack/Instatus host. Parsing that HTML is not a contract, so it is not used.
 *
 * ## What it probes instead: the documented `GET /health`
 *
 * The API reference documents `GET https://api.rendex.dev/health` — unauthenticated, outside
 * `/v1` — answering `{"status":"ok","product":"rendex","version":"1.8.0","timestamp":...}`
 * (measured live). The verdict comes from the BODY: `product === "rendex"` proves it is
 * Rendex answering (not an edge shell), and `status === "ok"` is healthy. A 5xx is down;
 * a Rendex body with another status is degraded; anything else is unknown, never down.
 * Same host as the API, so no extra allowlist entry is needed.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const HEALTH_URL = `${API_BASE}/health`;

const service: HealthCheckDefinition = {
  key: "service",
  title: "Rendex API health",
  description: "Unauthenticated GET https://api.rendex.dev/health, the vendor's documented " +
    'health route: `{"status":"ok","product":"rendex"}`.',
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(HEALTH_URL, { headers: { accept: "application/json" } });
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from /health`, ttlSeconds: 60 };
    }
    let body: { status?: unknown; product?: unknown; version?: unknown } | null = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    if (!body || typeof body !== "object" || body.product !== "rendex") {
      return {
        state: "unknown",
        message: `/health did not return a Rendex body (HTTP ${res.status})`,
      };
    }
    if (res.ok && body.status === "ok") {
      return {
        state: "ok",
        message: typeof body.version === "string" ? `Rendex ${body.version}` : undefined,
        ttlSeconds: 60,
      };
    }
    return {
      state: "degraded",
      message: `/health reported status ${JSON.stringify(body.status)} (HTTP ${res.status})`,
      ttlSeconds: 60,
    };
  },
};

export default service;
