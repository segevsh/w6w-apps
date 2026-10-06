/**
 * Is `api.murf.ai` answering? An UNSIGNED `GET /v1/speech/voices`.
 *
 * Measured 2026-10-06: with no `api-key` header the API answers `400 application/json`
 * `{"error_message":"Missing 'api-key' or 'token' header","error_code":400}`, and with a bogus one
 * `403 {"error_message":"Invalid 'api-key' header passed","error_code":403}`. A JSON body carrying
 * a numeric `error_code` and a string `error_message` is Murf's own envelope, so it proves the
 * API is serving — a PASS. An unsigned probe is judged on reachability, never on credential
 * validity (`auth:api-key` does that). A 200/HTML page is not the envelope and is not a pass.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, codeOf, messageOf } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "Murf API reachability",
  description:
    "An unauthenticated GET /v1/speech/voices. Murf's documented `error_code` / `error_message` refusal proves the API is serving; it says nothing about any credential.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/v1/speech/voices`, {
        headers: { accept: "application/json" },
      });
    } catch (e) {
      return { state: "down", message: `could not reach api.murf.ai: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: handled below */ }

    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    if (res.status === 429) return { state: "degraded", message: "API is rate limiting" };
    if (codeOf(body) !== undefined && messageOf(body) !== undefined) {
      return {
        state: "ok",
        message: "API answered with the documented authentication error",
        ttlSeconds: 60,
      };
    }
    return {
      state: "degraded",
      message: `unexpected ${res.status} from an unsigned GET /v1/speech/voices: ${
        raw.slice(0, 120)
      }`,
    };
  },
};

export default api;
