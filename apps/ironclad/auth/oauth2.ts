import type { AuthDefinition } from "@w6w/types";
import { oauthBase, type Region, REGIONS, SCOPES } from "../lib/client.ts";
import { authHeaders, displayFrom, type IroncladCredential, probeUserInfo } from "./credential.ts";

/**
 * OAuth 2.0 Authorization Code Grant against one Ironclad environment.
 *
 * Verified 2026-10-06 against `developer.ironcladapp.com/reference/authorization-code-grant`:
 *
 *  - `GET {host}/oauth/authorize?response_type=code&client_id&redirect_uri&scope&state`
 *  - `POST {host}/oauth/token` with `grant_type=authorization_code`; the client id and secret may
 *    be in the body or an HTTP Basic header.
 *  - Access tokens last 6 hours. Refresh tokens do not expire but **rotate**: a successful refresh
 *    issues BOTH a new access token and a new refresh token, so the old refresh token is spent.
 *  - The token is scoped on two axes: the resource scopes granted at consent, and the consenting
 *    user's own permissions in their company (a user in several companies picks one at consent).
 *
 * The OpenAPI `OAuth2` scheme lists the same `authorizationUrl`/`tokenUrl` per environment, and
 * `OAuth2Config` URLs are static strings decided before the browser redirect, so — like Docusign's
 * production/demo split — there is one auth method per environment (`oauth2`, `oauth2-eu1`,
 * `oauth2-demo`). They are separate stacks with separate OAuth clients; a Connection belongs to
 * exactly one.
 *
 * PKCE is not mentioned anywhere in Ironclad's OAuth documentation, so it is not requested.
 * There is no documented revocation endpoint, hence no `revokeUrl`.
 *
 * **Legacy static access tokens are not offered.** Ironclad documents them as deprecated and due
 * to be disabled; this app builds on OAuth only.
 */
export function createIroncladOAuth(region: Region): AuthDefinition {
  const host = REGIONS[region].host;
  const suffix = region === "us" ? "" : `-${region}`;
  return {
    key: `oauth2${suffix}`,
    type: "oauth2",
    displayName: `OAuth 2.0 — ${REGIONS[region].label}`,
    description:
      `Sign in to Ironclad at ${host} as yourself. Requires an OAuth client registered ` +
      "in Ironclad (Company Settings > API > Create new app) with the Authorization Code grant, " +
      "this installation's redirect URI, and the resource scopes this app requests.",
    connectionLabel: "Ironclad — {{companyName}} ({{regionLabel}})",
    oauth2: {
      authorizationUrl: `https://${host}/oauth/authorize`,
      tokenUrl: `${oauthBase(region)}/token`,
      refreshUrl: `${oauthBase(region)}/token`,
      scopes: SCOPES,
    },

    sign({ request, credential }) {
      for (const [name, value] of Object.entries(authHeaders(credential as IroncladCredential))) {
        request.headers[name] = value;
      }
      return request;
    },

    async test({ credential }, ctx) {
      const cred = credential as IroncladCredential;
      if (!cred?.accessToken) return { ok: false, message: "credential has no accessToken" };
      const result = await probeUserInfo(region, cred, ctx);
      return { ok: result.ok, message: result.message };
    },

    /** Records the host (so Actions reach the right environment) and who/what company this is. */
    async afterConnect({ credential }, ctx) {
      const cred = credential as IroncladCredential;
      const result = await probeUserInfo(region, cred, ctx);
      return displayFrom(region, result.info);
    },
  };
}

export default createIroncladOAuth("us");
