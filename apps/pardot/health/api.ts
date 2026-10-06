/**
 * Is the Account Engagement API answering on this connection's host?
 *
 *   - `kind: "dependency"`, `scope: "connection"` — a connection chooses between
 *     `pi.pardot.com` and `pi.demo.pardot.com`, so reachability is per host.
 *   - `credential: "context"` — the Connection names the host; the credential must NOT
 *     go on the wire (`sign` does not run), so the probe spends nobody's allowance.
 *
 * **A schema-correct auth error is a PASS.** An unsigned
 * `GET /api/v5/objects/prospects?fields=id&limit=1` answers `401 {"code":49,"message":"Access
 * Denied"}` on both hosts (measured 2026-10-06; "Access Denied" is in the error-codes page).
 * That proves DNS, TLS and the application's auth layer ran. The verdict is taken from the
 * BODY — a JSON object with a numeric `code` and string `message` — never from the status
 * code; anything else (an HTML shell, a generic 200) is not Account Engagement answering.
 * Whether the credential is valid is the derived `auth:*` check's question.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { errorText, hostFromConnection, OBJECTS_PATH } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description:
    "Unauthenticated GET on the connection's Account Engagement host. A 401 carrying the v5 `{code, message}` envelope passes — it proves the API and its auth layer are answering.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let host: string;
    try {
      host = hostFromConnection(ctx.connection);
    } catch (e) {
      return { state: "unknown", message: (e as Error).message };
    }
    const res = await ctx.fetch(`https://${host}${OBJECTS_PATH}/prospects?fields=id&limit=1`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from ${host}`, ttlSeconds: 120 };
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return { state: "down", message: `${host} returned a non-JSON body (HTTP ${res.status})` };
    }
    if (errorText(payload) !== undefined) {
      return { state: "ok", message: `HTTP ${res.status} — ${host} is serving`, ttlSeconds: 120 };
    }
    return { state: "unknown", message: `JSON body was not a v5 envelope (HTTP ${res.status})` };
  },
};

export default api;
