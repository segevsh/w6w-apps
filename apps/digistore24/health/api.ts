import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Unauthenticated reachability of the API itself.
 *
 * `GET /api/call/ping` with no key answers (measured 2026-10-05) HTTP 200
 * `{"result":"error","message":"No API key given.","code":2}` — the vendor's own
 * error envelope. That proves the API parsed the request and answered, so it is
 * a **pass**: whether a given credential works is the derived auth check's job.
 * Markup instead of JSON means something in front of the API is answering, and a
 * 5xx or a network failure is a real outage.
 */
export const PROBE_URL = `${API_BASE}/ping`;

const api: HealthCheckDefinition = {
  key: "api",
  title: "Digistore24 API reachability",
  description:
    "Unauthenticated GET /api/call/ping. A schema-correct result:error envelope (no API key) " +
    "proves the API answered; credential validity is checked separately.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    } catch (e) {
      return {
        state: "down",
        message: `www.digistore24.com is unreachable: ${
          e instanceof Error ? e.message : String(e)
        }`,
      };
    }
    const raw = await res.text().catch(() => "");
    let body: { result?: string; api_version?: string } | null = null;
    try {
      body = JSON.parse(raw);
    } catch { /* handled below */ }

    if (res.status >= 500) {
      return { state: "down", message: `Digistore24 returned HTTP ${res.status}` };
    }
    if (body?.result === "success" || body?.result === "error") {
      return { state: "ok", ttlSeconds: 60 };
    }
    if (raw.trimStart().startsWith("<")) {
      return {
        state: "down",
        message: `API host returned markup rather than JSON (HTTP ${res.status})`,
      };
    }
    return {
      state: "unknown",
      message: `API host returned HTTP ${res.status} with no readable result field`,
    };
  },
};

export default api;
