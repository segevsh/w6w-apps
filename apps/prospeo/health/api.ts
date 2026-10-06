/**
 * Is `api.prospeo.io` answering? An UNSIGNED `GET /account-information`.
 *
 * Measured 2026-10-06: with no credential, and with a fake one, the API answers
 * `400 content-type: application/json` with exactly
 * `{"error":true,"error_code":"INVALID_API_KEY"}`. That schema-correct refusal proves the host
 * is up and is the API (CloudFront alone would not produce it), so it is a PASS: an unsigned
 * probe is judged on reachability, never on credential validity — `auth:api-key` does that.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, type ErrorBody } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "Prospeo API reachability",
  description:
    "An unauthenticated GET /account-information. The documented `INVALID_API_KEY` error body proves api.prospeo.io is serving; it says nothing about any credential.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/account-information`, {
        headers: { accept: "application/json" },
      });
    } catch (e) {
      return { state: "down", message: `could not reach api.prospeo.io: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: ErrorBody | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: handled below */ }

    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    if (body?.error === true && body.error_code === "INVALID_API_KEY") {
      return {
        state: "ok",
        message: "API answered with the documented authentication error",
        ttlSeconds: 60,
      };
    }
    if (res.status === 429) return { state: "degraded", message: "API is rate limiting" };
    return {
      state: "degraded",
      message: `unexpected ${res.status} from an unsigned GET /account-information: ${
        body?.error_code ?? raw.slice(0, 120)
      }`,
    };
  },
};

export default api;
