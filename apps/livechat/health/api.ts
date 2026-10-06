/**
 * Is `api.livechatinc.com` answering? — an unsigned reachability probe.
 *
 * ## A schema-correct auth error is a PASS
 *
 * This check sends no credential (`credential: "none"`), so the healthy answer from a working API
 * is an authentication error. Measured live 2026-10-06, an unsigned
 * `POST /v3.6/configuration/action/list_channels` returns
 *
 *     HTTP/2 401  content-type: application/json
 *     {"error":{"type":"authentication","message":"No `Authorization` header"}}
 *
 * and the same call with a made-up Basic token returns the same envelope with the message
 * "Invalid access token". That documented `{error:{type,message}}` envelope proves DNS, TLS and the
 * application behind the edge are all answering. Whether any key is good is the derived
 * `auth:personal-access-token` check's job; the verdict here comes from the body, never from the
 * status code alone.
 *
 * Anything else fails: a 2xx (nothing should succeed unauthenticated, so something other than the
 * API is answering), HTML, or a 5xx.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { actionUrl, errorOf } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated POST of configuration/action/list_channels. A schema-correct `error` " +
    "envelope (HTTP 401, type `authentication`) is the expected healthy answer. Credential " +
    "validity is the `auth:personal-access-token` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(actionUrl("configuration", "list_channels"), {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: "{}",
      });
    } catch (e) {
      return { state: "down", message: `could not reach api.livechatinc.com: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = raw ? JSON.parse(raw) : undefined;
    } catch { /* a non-JSON body is itself the finding, handled below */ }

    if (res.status >= 500) {
      return { state: "down", message: `API returned ${res.status}`, ttlSeconds: 120 };
    }
    const err = errorOf(body);
    if (err?.type === "authentication") {
      return {
        state: "ok",
        message: "API answered with the documented authentication error",
        ttlSeconds: 120,
      };
    }
    if (err) {
      // Some other documented error type (e.g. service_unavailable, misdirected_request) —
      // the API is answering, but not in the healthy way.
      return {
        state: err.type === "service_unavailable" ? "down" : "degraded",
        message: `API answered with error type \`${err.type}\``,
      };
    }
    if (res.ok) {
      return {
        state: "degraded",
        message:
          `unauthenticated list_channels returned ${res.status}; expected an authentication error`,
      };
    }
    return {
      state: "unknown",
      message: `body was not a LiveChat error envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
