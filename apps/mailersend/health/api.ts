/**
 * Is `api.mailersend.com` answering? An UNSIGNED `GET /v1/domains`.
 *
 * Measured 2026-10-06: with no credential, and with a fake one, the API answers
 * `401 content-type: application/json` with exactly `{"message":"Unauthenticated."}`.
 * That schema-correct refusal proves the host is up and is the API (not a proxy or a CDN
 * error page), so it is a PASS: an unsigned probe is judged on reachability, never on
 * whether a credential is valid — the derived `auth:api-token` check does that.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "MailerSend API reachability",
  description:
    "An unauthenticated GET /v1/domains. The documented JSON 401 (`{ message }`) proves api.mailersend.com is serving; it says nothing about any credential.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/domains?limit=10`, {
        headers: { accept: "application/json" },
      });
    } catch (e) {
      return { state: "down", message: `could not reach api.mailersend.com: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: { message?: unknown } | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: handled below */ }

    if (res.status === 401) {
      return typeof body?.message === "string"
        ? {
          state: "ok",
          message: "API answered with the documented authentication error",
          ttlSeconds: 60,
        }
        : {
          state: "degraded",
          message: "401 without the documented { message } body — an intermediary may be answering",
        };
    }
    if (res.ok) {
      return {
        state: "degraded",
        message: `unauthenticated GET /v1/domains returned ${res.status}; expected 401`,
      };
    }
    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    return {
      state: "degraded",
      message: `API returned an unexpected ${res.status}: ${
        typeof body?.message === "string" ? body.message : raw.slice(0, 120)
      }`,
    };
  },
};

export default api;
