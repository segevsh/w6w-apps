/**
 * Is this connection's Formsite server reachable?
 *
 *   - `kind: "dependency"` — no machine-readable status exists (see `service`),
 *     so the one thing probed automatically is whether THIS account's server
 *     answers.
 *   - `scope: "connection"` — each Connection names its own server and user
 *     directory (`fs3`, `example`).
 *   - `credential: "context"` — needs the Connection to know WHICH host to
 *     call, and no credential to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: `*.formsite.com` is already on the app's
 *     allowlist.
 *
 * The probe is unauthenticated, so a **401 is a pass**: Formsite answers a
 * schema-correct `{ "error": { "message": "Missing access token.", "status": 401 } }`,
 * which proves the server is up and the API is serving. Whether the token is
 * any good is the derived `auth:*` check's job. Only a transport failure (the
 * hook throws), a 404 or a 5xx counts as down. A 429 means the account is
 * rate limited, which is the API answering, so it is `degraded`, not down.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl, targetFromConnection } from "../lib/client.ts";

const domain: HealthCheckDefinition = {
  key: "domain",
  title: "Account server reachable",
  description:
    "Unauthenticated request to this connection's Formsite server. A 401 passes — it proves the API is serving; token validity is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let target;
    try {
      target = targetFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "connection records no server or user directory" };
    }

    const res = await ctx.fetch(
      `${baseUrl(target.server)}/${encodeURIComponent(target.userDir)}/forms`,
      { headers: { accept: "application/json" } },
    );
    if (res.status === 404) {
      return { state: "down", message: "server or user directory not found" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `server returned ${res.status}` };
    }
    if (res.status === 429) {
      return { state: "degraded", message: "account is rate limited (50 calls/minute)" };
    }
    // 200 and 401 both mean the server is answering. That is the whole question.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default domain;
