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
 *   - **Tenant segment: `organizations`, not `common`.** The endpoint path is
 *     `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/{authorize,token}`
 *     where `{tenant}` is `common`, `organizations`, `consumers`, or a tenant id
 *     / verified domain. The sibling `outlook` App uses `common` because Outlook
 *     genuinely serves personal accounts. Teams does not: **every** Teams
 *     delegated permission this App requests is documented "Delegated (personal
 *     Microsoft account): Not supported." `organizations` restricts the sign-in
 *     page to work-or-school accounts, so a consumer account is refused at the
 *     door with a comprehensible message instead of completing the dance and
 *     then failing every action with a 403.
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
 * Scopes are the least-privileged set that covers every action in this App —
 * see the README's Authentication table for the per-scope justification, and in
 * particular for which of them need a **tenant administrator** to consent.
 */
import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Work-or-school accounts only. See the note on the tenant segment above.
 * A single-tenant deployment substitutes its own tenant id and overrides these
 * URLs when it registers its own Entra application.
 */
const TENANT = "organizations";

export const AUTHORIZATION_URL =
  `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
export const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;

export const SCOPES = [
  // Refresh token.
  "offline_access",
  // `test` / `afterConnect` probe (`GET /me`).
  "User.Read",
  // List Teams, Get Team.
  "Team.ReadBasic.All",
  // List Team Members, and Add Team Member — including with the `owner` role,
  // which the least-privileged TeamMember.ReadWriteNonOwnerRole.All cannot grant.
  "TeamMember.ReadWrite.All",
  // List Channels, Get Channel, Get Primary Channel.
  "Channel.ReadBasic.All",
  // List Channel Members. Admin-consent.
  "ChannelMember.Read.All",
  // Send Channel Message, Reply to Channel Message.
  "ChannelMessage.Send",
  // List Channel Messages, Get Channel Message, List Message Replies. Admin-consent.
  "ChannelMessage.Read.All",
  // List Chats, List Chat Messages, Send Chat Message — one scope covers all
  // three (it is the documented higher-privileged option for each).
  "Chat.ReadWrite",
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
    "Public OAuth flow for a work or school account. Requires a Microsoft Entra ID app registration (client_id / client_secret / redirect_uri) configured on this w6w installation. Several of the requested scopes need tenant-administrator consent — see the README.",
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
   * `User.Read`, so a credential that legitimately lacks an admin-consented
   * Teams scope still reports as live rather than as broken. Deliberately not
   * `GET /me/joinedTeams`: that needs `Team.ReadBasic.All`, and a user with no
   * teams would still be a working credential.
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
