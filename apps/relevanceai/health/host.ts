import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * Is THIS connection's region host answering?
 *
 * The question is separate from both of the app's other checks, which is the
 * whole reason it exists:
 *
 *  - `service` covers Relevance AI's platform as a whole — but it is scoped to
 *    the vendor's three shared `API Gateways` components, and it says nothing
 *    about a single organization's host.
 *  - The derived `auth:api-token` check walks the same `api-<region>.stack…`
 *    host, so a mistyped region id fails there too — as "Relevance AI rejected
 *    the key", which is the wrong diagnosis. That is exactly the confusion
 *    `HEALTHCHECKS.md` warns about: "the site is gone" and "the token expired"
 *    are different problems with different fixes.
 *
 * The region id is the one piece of this app's configuration that no vendor
 * lookup can complete for the user: it is copied by hand off the Integrations &
 * API Keys page, the vendor's own docs name three canonical regions while the
 * live schema's `region` enum lists ten, and there is no way to discover the id
 * from a key. A cheap per-connection check that separates "wrong id" from "wrong
 * key" is therefore worth its request.
 *
 * ## Annotation
 *
 *  - `kind: "dependency"` — one of the four questions a host may ask, and the
 *    only one that is per-Connection.
 *  - `scope: "connection"` — every Connection points at a different region host.
 *  - `credential: "context"` — the posture a boolean would lose. The check needs
 *    the Connection to know WHICH host to call, and needs no credential to
 *    interpret the answer. `sign` must not run.
 *  - No `network.allow` is declared: `*.stack.tryrelevance.com` is already on the
 *    app's allowlist, and a `context` check is unsigned regardless.
 *  - `severity` defaults to `degraded` for this kind.
 *
 * ## The probe is deliberately unauthenticated, so a 401 is a pass
 *
 * `GET /latest/auth/info` with no credential answers `401
 * {"error_type":"authorization_header_missing"}` on a live host — measured
 * 2026-09-22. That 401 proves DNS resolved, TLS terminated and the vendor's API
 * is answering, which is the entire question here. Only a transport failure, a
 * 404 (region id belonging to no gateway) or a 5xx counts as down.
 */
const host: HealthCheckDefinition = {
  key: "host",
  title: "Region API host reachable",
  description:
    "Unauthenticated request to this connection's `api-<region id>.stack.tryrelevance.com` host. A " +
    "401 passes — it proves the region host is serving; credential validity is the `auth:*` " +
    "check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { regionId?: string };
    if (!display.regionId) {
      return { state: "unknown", message: "connection records no region id" };
    }

    const url = `${baseUrl(display.regionId)}/auth/info`;
    let res: Response;
    try {
      res = await ctx.fetch(url, { headers: { accept: "application/json" } });
    } catch (error) {
      return {
        state: "down",
        message:
          `${display.regionId} is not reachable (${String(error)}) — check the region id against ` +
          "the Integrations & API Keys page",
      };
    }

    if (res.status === 404) {
      return {
        state: "down",
        message:
          `no API gateway answers for region id \`${display.regionId}\` — check it against the ` +
          "Integrations & API Keys page",
      };
    }
    if (res.status >= 500) {
      return { state: "down", message: `region host returned ${res.status}` };
    }
    // 200 and 401 both mean the gateway is serving. That is the whole question.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default host;
