/**
 * OAuth 2.0 authorization code flow against the Microsoft identity platform
 * (Microsoft Entra ID), v2.0 endpoints.
 *
 * https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
 *
 * You register an application (Entra admin center → App registrations), add a
 * Web redirect URI, and store the resulting `client_id` + `client_secret` +
 * `redirect_uri` on the w6w server via
 * `PUT /apps/:id/oauth-config/oauth2`. End users then connect through the
 * browser authorization dance.
 *
 * Microsoft specifics that drove the config below:
 *
 *   - **Tenant segment: `organizations`, not `common`.** The Excel REST API does
 *     not serve consumer OneDrive. The overview states plainly that "only the
 *     files stored in business platform are supported by Excel REST APIs", and
 *     the permissions tables for `createSession`, `worksheets` list and
 *     `usedRange` all say *Delegated (personal Microsoft account): Not
 *     supported*. `common` would let a personal account complete the consent
 *     screen and then fail on the first real call; `organizations` restricts the
 *     flow to work-or-school accounts, which is the set that can actually use
 *     this App. A single-tenant deployment overrides these URLs with its own
 *     tenant id or verified domain.
 *
 *   - **Refresh tokens come from a scope, not a parameter.** Unlike Google
 *     (`access_type=offline`), Microsoft issues a refresh token only when
 *     `offline_access` is among the requested scopes — so it is listed as a
 *     scope and there are no `extraAuthParams`.
 *
 *   - **PKCE.** The docs call `code_challenge` "recommended for all application
 *     types, both public and confidential clients", and `S256` is supported, so
 *     it is left on (the spec default is `true` anyway).
 *
 * Scopes are the least-privileged set that covers every action in this App:
 * `Files.ReadWrite` (every workbook read and write — the Excel reference names
 * `Files.Read` for reads and `Files.ReadWrite` for writes, and this App writes),
 * `User.Read` (the `test` / `afterConnect` probe), `offline_access` (refresh
 * token).
 */
import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/** Work-or-school accounts only. See the note on the tenant segment above. */
const TENANT = "organizations";

export const AUTHORIZATION_URL =
  `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
export const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;

export const SCOPES = [
  "offline_access",
  "User.Read",
  "Files.ReadWrite",
];

interface GraphUser {
  id?: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
}

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Microsoft)",
  description:
    "Public OAuth flow for a work or school Microsoft account. Requires a Microsoft Entra ID app registration (client_id / client_secret / redirect_uri) configured on this w6w installation. Personal Microsoft accounts cannot use the Excel API.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: AUTHORIZATION_URL,
    tokenUrl: TOKEN_URL,
    scopes: SCOPES,
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /me` is the cheapest authenticated Graph call and needs only
   * `User.Read`, so a credential that legitimately lacks a files scope still
   * reports as live rather than as broken. Probing a workbook instead would
   * need a workbook to probe, which a fresh connection does not have.
   * https://learn.microsoft.com/en-us/graph/api/user-get
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Microsoft Graph returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me`);
    if (!res.ok) return {};
    const profile = await res.json().catch(() => null) as GraphUser | null;
    if (!profile) return {};
    // `mail` is null for accounts without a provisioned mailbox address;
    // `userPrincipalName` is always present and is what the user recognises.
    const email = profile.mail ?? profile.userPrincipalName;
    return {
      user: {
        id: profile.id,
        email,
        name: profile.displayName ?? email,
      },
    };
  },
};

export default oauth2;
