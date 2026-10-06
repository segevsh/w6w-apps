import type { HealthCheckDefinition, HealthReport } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Is the Lodgify API **reachable**? — the unsigned probe.
 *
 * `GET /v1/countries` is a public reference list: measured live 2026-10-05 it answers
 * `200` with `[{"code":"AF","name":"Afghanistan"}, ...]` and NO credential, while the
 * account endpoints answer 403. That makes it the one endpoint that proves the API is
 * up independently of this connection's key — which is why it is an unsigned,
 * informational check and is never used as the credential probe (see `auth/api-key.ts`).
 * The documented shape (an array of `{code, name}`) is what proves it is Lodgify
 * answering, not an edge page that also says 200. An unreachable host is `unknown`,
 * never `down`, since an unsigned probe cannot speak for the account.
 */
const check: HealthCheckDefinition = {
  key: "reachability",
  kind: "dependency",
  scope: "app",
  credential: "none",
  title: "Lodgify API reachable (unsigned)",
  description: "Unsigned GET /v1/countries; the documented {code, name} list proves the API " +
    "is reachable without proving this connection's key is live.",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx): Promise<HealthReport> {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/v1/countries`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return {
        state: "unknown",
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
    const first = Array.isArray(body) ? body[0] as { code?: unknown; name?: unknown } : undefined;
    if (first && typeof first.code === "string" && typeof first.name === "string") {
      return {
        state: "ok",
        message: "reachable, answering the documented country list",
        latencyMs,
        ttlSeconds: 300,
      };
    }
    return {
      state: "degraded",
      message: `answered HTTP ${res.status} but not with the documented country list: ${
        text.trim().slice(0, 200) || "no body"
      }`,
      latencyMs,
    };
  },
};

export default check;
