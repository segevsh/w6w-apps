import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Is QuickChart answering?
 *
 * QuickChart has a Statuspage (`quickchart.statuspage.io`: Website, Community API, Paid API) but
 * its page and component `updated_at` are 2020-11-07 — nothing has been posted since, so an
 * "all operational" read from it would be false assurance and is deliberately not used
 * (`status.quickchart.io` serves a different, password-protected page, not Statuspage JSON).
 * Checked 2026-10-06. This probes the service itself instead: `GET /healthcheck` answers
 * `200 {"success":true,"version":"1.4.1"}` — a documented-shape body, not a generic 200.
 * It is unauthenticated, so it answers about the service rather than about any API key.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "QuickChart reachable",
  description: "GET /healthcheck — expects {success: true, version}.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/healthcheck`, {
      headers: { accept: "application/json" },
    });
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from quickchart.io`, ttlSeconds: 120 };
    }
    const body = await res.json().catch(() => null) as
      | { success?: boolean; version?: string }
      | null;
    if (res.ok && body?.success === true) {
      return {
        state: "ok",
        message: body.version ? `QuickChart ${body.version}` : undefined,
        ttlSeconds: 120,
      };
    }
    if (res.ok && body?.success === false) {
      return { state: "down", message: "healthcheck reported success: false", ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `healthcheck answered HTTP ${res.status} without the documented JSON body`,
    };
  },
};

export default service;
