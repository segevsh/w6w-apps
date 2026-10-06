/**
 * Is this connection's Quaderno account host reachable?
 *
 * `kind: "dependency"`, `scope: "connection"`, `credential: "context"` — the
 * check needs the Connection to know WHICH host to call and no credential to
 * interpret the answer, so `sign` must not run.
 *
 * Probe: unsigned `GET /api/contacts`. Measured 2026-10-06: an unsigned
 * request to any `*.quadernoapp.com` subdomain — including one that does not
 * exist — answers `401 {"error":"Wrong API key or the user does not exist."}`.
 * That schema-correct auth error proves the API tier is reachable and
 * answering, so it is a PASS; whether the key is good is the derived
 * `auth:api-key` check's job. Because an unknown subdomain gets the same 401,
 * this check cannot catch a mistyped account name — `auth:api-key` does. Only
 * a 5xx, a transport failure, or a non-JSON answer is a problem.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const account: HealthCheckDefinition = {
  key: "account",
  title: "Account host reachable",
  description:
    "Unauthenticated request to this connection's Quaderno host. A JSON `401` passes — it proves the API is answering; credential validity is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { account?: string };
    if (!display.account) return { state: "unknown", message: "connection records no account" };

    const res = await ctx.fetch(`${baseUrl(display.account)}/contacts`, {
      headers: { accept: "application/json" },
    });
    if (res.status >= 500) return { state: "down", message: `host returned ${res.status}` };
    const body = await res.json().catch(() => null) as { error?: unknown } | unknown[] | null;
    if (body === null) {
      return { state: "degraded", message: `host answered ${res.status} with a non-JSON body` };
    }
    // 200 (a list) or a JSON `{ error }` refusal: the API tier is serving.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default account;
