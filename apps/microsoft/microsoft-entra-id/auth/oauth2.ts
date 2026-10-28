/**
 * OAuth 2.0 authorization code flow against the Microsoft identity platform (Microsoft Entra ID),
 * v2.0 endpoints, for calling Microsoft Graph with the signed-in administrator's delegated rights.
 *
 * https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
 *
 * You register an application (Entra admin center → App registrations), add a Web redirect URI,
 * and store the resulting `client_id` + `client_secret` + `redirect_uri` on the w6w server via
 * `PUT /apps/:id/oauth-config/oauth2`. End users then connect through the browser authorization
 * dance.
 *
 * Microsoft specifics that drove the config below (the same as the sibling `teams` App):
 *
 *   - **Tenant segment: `organizations`, not `common`.** Managing a directory is a work-or-school
 *     concept: every user, group and role call here is "Delegated (personal Microsoft account):
 *     Not supported". `organizations` refuses a consumer account at the sign-in page instead of
 *     letting it complete the dance and fail every action with a 403. A single-tenant deployment
 *     substitutes its own tenant id when it registers its own app.
 *
 *   - **Refresh tokens come from a scope, not a parameter.** Microsoft issues one only when
 *     `offline_access` is among the requested scopes, so it is a scope and there are no
 *     `extraAuthParams`.
 *
 *   - **PKCE** is recommended by Microsoft for every client type, and `S256` is supported.
 *
 * Almost every scope below is **admin-consent only** — see the README's Authentication table.
 */
import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const TENANT = "organizations";

export const AUTHORIZATION_URL =
  `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
export const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;

export const SCOPES = [
  // Refresh token.
  "offline_access",
  // `test` / `afterConnect` probe (`GET /me`).
  "User.Read",
  // List/Get/Create/Update/Delete User, Reset User Password, List User Memberships.
  "User.ReadWrite.All",
  // Restore Deleted Item, when the item is a user — Microsoft documents this as the least
  // privileged permission for restoring a user.
  "User.DeleteRestore.All",
  // Group CRUD, members, owners, restoring a deleted group.
  "Group.ReadWrite.All",
  // List/Get Applications and Service Principals, List Deleted Items for those types.
  "Application.Read.All",
  // Get Directory Object, Get Organization.
  "Directory.Read.All",
  // List Directory Roles, List Directory Role Members.
  "RoleManagement.Read.Directory",
  // Get Organization (all properties; User.Read alone returns only id, displayName and domains).
  "Organization.Read.All",
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
    "Public OAuth flow for a work or school account. Requires a Microsoft Entra ID app registration (client_id / client_secret / redirect_uri) configured on this w6w installation. Nearly every requested scope needs tenant-administrator consent, and the signed-in user needs a directory role such as User Administrator — see the README.",
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
   * `GET /me` needs only `User.Read`, so a credential whose admin consent is incomplete still
   * reports as live. Its body is the caller's own profile, never the token.
   * https://learn.microsoft.com/en-us/graph/api/user-get
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return { ok: true };
    // Classify from Graph's own error code in the body; the status is only a hint.
    const body = await res.json().catch(() => null) as
      | { error?: { code?: string } }
      | null;
    const code = body?.error?.code;
    return {
      ok: false,
      message: code
        ? `Microsoft Graph rejected the credential: ${code}`
        : `Microsoft Graph returned an unrecognised response (HTTP ${res.status})`,
    };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me`);
    if (!res.ok) return {};
    const profile = await res.json().catch(() => null) as GraphUser | null;
    if (!profile) return {};
    // `mail` is null for accounts without a mailbox; `userPrincipalName` is always present.
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
