import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, parseProblem } from "../lib/client.ts";

/**
 * Is the AccuLynx API answering?
 *
 * AccuLynx documents `GET /diagnostics/ping` ("Check if the API Server Is Responsive") and, measured
 * live on 2026-10-06, it answers an UNSIGNED request:
 *
 *     HTTP/2 200
 *     content-type: application/json; charset=utf-8
 *     {"date":"2026-10-06T02:26:38Z"}
 *
 * That makes it a credential-free reachability probe against the one host every action calls.
 * (It must not be used as the auth probe for exactly that reason; see `auth/bearer-token.ts`.)
 *
 * ## What counts
 *
 *  - **200 with a string `date`** — the documented shape. `ok`.
 *  - **401 with a problem+json body** (`title`/`status`) — if AccuLynx ever puts ping behind the
 *    key, a schema-correct auth error still proves the API routed and answered. `ok`.
 *  - **Anything else** — an HTML edge page, a 200 without `date` (a generic 200 for an unknown
 *    path would look like this), a 404 or 5xx. `down`.
 *
 * `scope: "app"`/`credential: "none"`: one shared host, no per-tenant subdomain, and no reason to
 * spend a customer's rate limit on a vendor-wide question. No `network.allow`: the host is already
 * the app's own egress host.
 */

export const PROBE_URL = `${API_BASE}/diagnostics/ping`;

const ping: HealthCheckDefinition = {
  key: "ping",
  title: "AccuLynx API reachability",
  description: "Unsigned GET /diagnostics/ping. 200 with a `date` field (or a schema-correct " +
    "401) proves the API is answering. Says nothing about any credential.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    const text = await res.text().catch(() => "");
    const body = parseProblem(text) as { date?: unknown; title?: unknown; status?: unknown } | null;

    if (res.ok && typeof body?.date === "string") {
      return { state: "ok", message: `ping answered ${body.date}`, ttlSeconds: 60 };
    }
    if (res.status === 401 && typeof body?.title === "string" && typeof body?.status === "number") {
      return { state: "ok", message: `API answered 401 ${body.title}`, ttlSeconds: 60 };
    }
    if (res.ok) {
      return { state: "down", message: "ping answered 2xx without a `date` field" };
    }
    return { state: "down", message: `API returned HTTP ${res.status} for /diagnostics/ping` };
  },
};

export default ping;
