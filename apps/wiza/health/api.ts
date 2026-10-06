/**
 * Is `wiza.co/api` answering? An UNSIGNED `GET /api/meta/credits`.
 *
 * Measured 2026-10-06: with no credential, and with a fake one, the API answers
 * `401 application/json` with exactly `{"status":{"code":401,"message":"Invalid API key."}}`.
 * That schema-correct refusal proves the API is serving (the marketing site and a Cloudflare
 * challenge page would not produce it), so it is a PASS: an unsigned probe is judged on
 * reachability, never on credential validity — `auth:api-key` does that.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, codeOf, type WizaBody } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "Wiza API reachability",
  description:
    "An unauthenticated GET /api/meta/credits. The documented `Invalid API key.` error envelope proves the Wiza API is serving; it says nothing about any credential.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/api/meta/credits`, {
        headers: { accept: "application/json" },
      });
    } catch (e) {
      return { state: "down", message: `could not reach wiza.co: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: WizaBody | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: handled below */ }

    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    if (
      codeOf(body) === 401 && typeof (body?.status as { message?: unknown })?.message === "string"
    ) {
      return {
        state: "ok",
        message: "API answered with the documented authentication error",
        ttlSeconds: 60,
      };
    }
    if (res.status === 429) return { state: "degraded", message: "API is rate limiting" };
    return {
      state: "degraded",
      message: `unexpected ${res.status} from an unsigned GET /api/meta/credits: ${
        raw.slice(0, 120)
      }`,
    };
  },
};

export default api;
