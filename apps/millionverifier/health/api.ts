/**
 * Is the MillionVerifier API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /api/v3/credits`.
 * **A schema-correct auth error is a PASS.** Measured 2026-10-06: with no key the API
 * answers `200 {"result":"error","error":"No apikey specified"}` (HTTP 200 — the vendor
 * answers every error that way), which proves the application is serving. The verdict is
 * read from the body (a JSON object with a string `error` or a numeric `credits`), not the
 * status; a 5xx is `down`; HTML or anything else is `unknown`. Key validity is the derived
 * `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { SINGLE_HOST } from "../lib/client.ts";

export const PROBE_URL = `https://${SINGLE_HOST}/api/v3/credits`;

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /api/v3/credits. MillionVerifier's JSON error body " +
    "(`No apikey specified`) passes: it proves the application is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from ${SINGLE_HOST}`, ttlSeconds: 120 };
    }
    let body: { error?: unknown; credits?: unknown } | undefined;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    if (body && (typeof body.error === "string" || typeof body.credits === "number")) {
      return {
        state: "ok",
        message: `${SINGLE_HOST} is serving (HTTP ${res.status})`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "unknown",
      message:
        `${SINGLE_HOST} answered HTTP ${res.status} with a body that is not MillionVerifier's JSON`,
    };
  },
};

export default api;
