import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX, JSONAPI, parseErrors } from "../lib/client.ts";
import { REGIONS, type ZohoWorkDriveRegion } from "../lib/regions.ts";

/**
 * OAuth 2.0 authorization-code flow — WorkDrive's only documented auth
 * (`oauth-authentication-overview` / `-scopes` / `-making-api-calls-with-access-token` pages,
 * verified 2026-10-06). Register a Zoho API console client for the data centre your account
 * lives in and store `client_id` / `client_secret` / `redirect_uri` on this w6w installation.
 *
 * One `AuthDefinition` per data centre (see `lib/regions.ts`): the OAuth authorization/token
 * host is part of the flow, so the user picks the method matching their data centre.
 *
 * Zoho specifics:
 *   - Requests carry `Authorization: Zoho-oauthtoken <token>` (stamped in `sign` only).
 *   - `access_type=offline` + `prompt=consent` are needed or Zoho omits the refresh token and
 *     the connection dies with the 1-hour access token.
 *   - Scopes are `WorkDrive.<scope>.<CREATE|READ|UPDATE|DELETE|ALL>`; the search action also
 *     needs `ZohoSearch.securesearch.READ` (documented on `search-records`).
 */
export const SCOPES = [
  "WorkDrive.users.READ",
  "WorkDrive.team.READ",
  "WorkDrive.teamfolders.ALL",
  "WorkDrive.files.ALL",
  "WorkDrive.links.ALL",
  "ZohoSearch.securesearch.READ",
];

function buildOAuth2(region: ZohoWorkDriveRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho WorkDrive account lives in the ` +
      `${region.label} data centre (your WorkDrive URL ends in the matching domain) — see the ` +
      `README's "Regional accounts" section if you are not sure which one that is.`,
    connectionLabel: `Zoho WorkDrive (${region.label})`,
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
      request.headers["authorization"] = `Zoho-oauthtoken ${accessToken}`;
      return request;
    },

    /**
     * `GET /users/me` — needs only `WorkDrive.users.READ`; the body carries the caller's email
     * and storage info, never the credential. Classified by the vendor's own error `id`
     * (`F7003` invalid token, `F7004` invalid scope, `R008` authorization check failed), not
     * the HTTP status: a request with no token at all is answered `500 INVALID_TICKET`.
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${apiBase}${API_PREFIX}/users/me`, {
        method: "GET",
        headers: {
          accept: JSONAPI,
          authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });
      if (res.ok) return { ok: true };

      const errors = parseErrors(await res.text().catch(() => ""));
      const first = errors[0];
      if (first?.id === "F7003" || first?.id === "F000") {
        return {
          ok: false,
          message: `Zoho WorkDrive rejected the access token (${first.id}): ${first.title ?? ""}`,
        };
      }
      if (first?.id === "F7004") {
        return {
          ok: false,
          message: `Zoho WorkDrive says the token lacks a required scope (F7004): ${
            first.title ?? ""
          }`,
        };
      }
      return {
        ok: false,
        message: `Zoho WorkDrive returned HTTP ${res.status}${
          first?.id ? ` (${first.id}: ${first.title ?? ""})` : ""
        } for GET /users/me`,
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
