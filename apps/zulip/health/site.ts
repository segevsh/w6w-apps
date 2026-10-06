/**
 * Is this connection's Zulip organization reachable?
 *
 *   - `kind: "dependency"`, `scope: "connection"` — every Connection is a different
 *     `<org>.zulipchat.com` host; the platform as a whole is the `service` check's question.
 *   - `credential: "context"` — needs the Connection to know WHICH host, needs no credential.
 *   - Probe: `GET /api/v1/server_settings`, which Zulip documents as unauthenticated on every
 *     server. Measured 2026-10-06: a real server answers 200 `{"result":"success",
 *     "zulip_version":…}`; an unknown Cloud subdomain answers 400 `{"msg":"Invalid subdomain",
 *     "code":"BAD_REQUEST"}` — so a 400 here means the org is gone or misspelt, which is down.
 *   - No `network.allow`: `*.zulipchat.com` already covers it.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseFromConnection } from "../lib/client.ts";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Organization reachable",
  description:
    "Unauthenticated GET of this organization's /api/v1/server_settings. Credential validity is the `auth:basic` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let base: string;
    try {
      base = baseFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "connection records no organization subdomain" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/server_settings`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach the organization: ${e}` };
    }
    const body = await res.json().catch(() => null) as
      | { result?: string; msg?: string; zulip_version?: string }
      | null;

    if (res.status >= 500) return { state: "down", message: `organization returned ${res.status}` };
    if (res.status === 400 || res.status === 404) {
      return {
        state: "down",
        message: `${body?.msg ?? `HTTP ${res.status}`} — the organization subdomain may be wrong`,
      };
    }
    if (res.ok && body?.result === "success") return { state: "ok", ttlSeconds: 120 };
    return { state: "degraded", message: `unexpected ${res.status} from /server_settings` };
  },
};

export default site;
