/**
 * Is the Microsoft Graph API answering?
 *
 *   - `kind: "dependency"`, `scope: "app"` — one shared host, `graph.microsoft.com`; the answer is
 *     identical for every Connection.
 *   - `credential: "none"` — `sign` must not run, so the probe spends nobody's allowance.
 *
 * **A schema-correct auth error is a PASS.** An unsigned `GET /v1.0/organization` answers
 * `401 {"error":{"code":"InvalidAuthenticationToken","message":"Access token is empty.",…}}`
 * (measured 2026-10-06). That proves DNS, TLS, the Graph front door and its auth layer all ran.
 * The verdict is taken from the BODY — an error envelope with a string `error.code` — not from the
 * status code: an HTML edge page is a failure, a 5xx is down, and a transport failure surfaces as
 * the hook throwing. Whether any one credential is valid is the derived `auth:oauth2` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "Microsoft Graph reachable",
  description:
    "Unauthenticated GET https://graph.microsoft.com/v1.0/organization. A 401 carrying Graph's JSON error envelope (`error.code`) passes — it proves the API and its auth layer are answering.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/organization`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from Microsoft Graph`, ttlSeconds: 120 };
    }
    let payload: { error?: { code?: unknown } } | null = null;
    try {
      payload = JSON.parse(text);
    } catch {
      return { state: "down", message: `endpoint returned a non-JSON body (HTTP ${res.status})` };
    }
    if (typeof payload?.error?.code === "string") {
      return {
        state: "ok",
        message: `HTTP ${res.status} ${payload.error.code} — Graph is serving`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "unknown",
      message: `JSON body was not a Graph error envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
