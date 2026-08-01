/**
 * Is this connection's Snowflake account host reachable?
 *
 *   - `kind: "dependency"` — a per-account question, distinct from the vendor
 *     platform status the `service` check answers.
 *   - `scope: "connection"` — every Connection points at a different account
 *     host.
 *   - `credential: "context"` — the Connection supplies WHICH host to call;
 *     no credential is needed to interpret the answer, and `sign` must not
 *     run. The probe is deliberately unauthenticated: it POSTs to the
 *     statements endpoint with no `Authorization` header at all.
 *   - No `network.allow` is declared: `*.snowflakecomputing.com` is already
 *     on the app's allowlist, and a `context` check is unsigned regardless.
 *
 * Reading the response: an unauthenticated call to `/api/v2/statements`
 * fails auth, not routing — Snowflake answers 401 (vendor code 390144, "JWT
 * token is invalid") once the host has resolved and the API is serving. That
 * is exactly what this check wants to know, and it deliberately says nothing
 * about whether any particular credential is valid — that is the derived
 * `auth:key-pair` check's job. Only a transport failure (the hook throws), a
 * 404 (account not found — e.g. renamed/dropped) or a 5xx counts as down.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl, STATEMENTS_PATH } from "../lib/client.ts";

const account: HealthCheckDefinition = {
  key: "account",
  title: "Account host reachable",
  description:
    "Unauthenticated POST to this connection's Snowflake account host. A 401/403 passes — it " +
    "proves the account resolves and the SQL API is answering; credential validity is the " +
    "auth:key-pair check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { account?: string };
    if (!display.account) {
      return { state: "unknown", message: "connection records no account" };
    }

    const res = await ctx.fetch(`${baseUrl(display.account)}${STATEMENTS_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ statement: "SELECT 1" }),
    });
    if (res.status === 404) {
      return { state: "down", message: "account not found — it may have been renamed or dropped" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `account host returned ${res.status}` };
    }
    // 401/403 (no credential presented) and anything else that isn't a
    // routing failure both mean the account host is serving. That is the
    // whole question this check answers.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default account;
