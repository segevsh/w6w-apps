import type { AuthDefinition } from "@w6w/types";
import { parseError } from "../lib/client.ts";
import { REGIONS, type ZohoProjectsRegion } from "../lib/regions.ts";

/**
 * OAuth 2.0 authorization-code flow — Zoho Projects' only documented auth ("API Authentication"
 * pages of `https://projects.zoho.com/api-docs`, verified 2026-10-06). Register a Zoho API
 * console client for the data centre your account lives in and store `client_id` /
 * `client_secret` / `redirect_uri` on this w6w installation.
 *
 * One `AuthDefinition` per data centre (see `lib/regions.ts`): the OAuth authorization/token
 * host is part of the flow, so the user picks the method matching their data centre.
 *
 * Zoho specifics:
 *   - V3 documents `Authorization: Bearer <token>` (stamped in `sign` only).
 *   - `access_type=offline` + `prompt=consent` are needed or Zoho omits the refresh token and
 *     the connection dies with the 1-hour access token.
 *   - Scopes are `ZohoProjects.<module>.<CREATE|READ|UPDATE|DELETE|ALL>`; every module this
 *     app touches is listed below.
 */
export const SCOPES = [
  "ZohoProjects.portals.READ",
  "ZohoProjects.projects.ALL",
  "ZohoProjects.tasklists.ALL",
  "ZohoProjects.tasks.ALL",
  "ZohoProjects.milestones.ALL",
  "ZohoProjects.bugs.ALL",
  "ZohoProjects.timesheets.ALL",
  "ZohoProjects.users.READ",
];

function buildOAuth2(region: ZohoProjectsRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho Projects account lives in the ` +
      `${region.label} data centre (your Zoho Projects URL ends in the matching domain) — see ` +
      `the README's "Regional accounts" section if you are not sure which one that is.`,
    connectionLabel: `Zoho Projects (${region.label})`,
    oauth2: {
      authorizationUrl: `https://${region.accountsHost}/oauth/v2/auth`,
      tokenUrl: `https://${region.accountsHost}/oauth/v2/token`,
      refreshUrl: `https://${region.accountsHost}/oauth/v2/token`,
      scopes: SCOPES,
      extraAuthParams: { access_type: "offline", prompt: "consent" },
      pkce: true,
    },

    sign({ request, credential }) {
      const { accessToken } = credential as { accessToken: string };
      request.headers["authorization"] = `Bearer ${accessToken}`;
      return request;
    },

    /**
     * `GET /api/v3/portals` — lists the caller's portals (names, owner, plan), never the token.
     * Classified by the vendor's own error `title` in the body, not the HTTP status: a probed
     * bad token answers `401 INVALID_OAUTHTOKEN`, a missing one `401 INVALID_TICKET`.
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${apiBase}/api/v3/portals`, {
        method: "GET",
        headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) return { ok: true };

      const err = parseError(await res.text().catch(() => ""));
      const code = err?.title ?? "";
      if (code === "INVALID_OAUTHTOKEN" || code === "INVALID_TICKET") {
        return {
          ok: false,
          message: `Zoho Projects rejected the access token (${code})${
            err?.message ? `: ${err.message}` : ""
          }`,
        };
      }
      if (/SCOPE/i.test(code)) {
        return {
          ok: false,
          message: `Zoho Projects says the token lacks a required scope (${code}): ${
            err?.message ?? ""
          }`,
        };
      }
      return {
        ok: false,
        message: `Zoho Projects returned HTTP ${res.status}${
          code ? ` (${code}${err?.message ? `: ${err.message}` : ""})` : ""
        } for GET /api/v3/portals`,
      };
    },

    /** Records this region's fixed API host on the connection; every action reads it back. */
    afterConnect() {
      return { apiHost: region.apiHost, region: region.label };
    },
  };
}

const oauth2Methods: AuthDefinition[] = REGIONS.map(buildOAuth2);

export default oauth2Methods;
export { buildOAuth2 };
