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
 * The Microsoft specifics are the same three the sibling Graph Apps
 * (`outlook`, `teams`, `excel`) already settled, and are restated rather than
 * cross-referenced because an App is read on its own:
 *
 *   - **Tenant segment.** The endpoint path is
 *     `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/{authorize,token}`
 *     where `{tenant}` is one of `common`, `organizations`, `consumers`, or a
 *     tenant id / verified domain. `common` is used here because it is the only
 *     value that accepts *both* work-or-school and personal Microsoft accounts.
 *     That matters more for To Do than for the other Graph Apps: To Do is a
 *     consumer product as much as a work one, and Microsoft documents
 *     `Tasks.ReadWrite` as a delegated permission for **both** account kinds. A
 *     deployment that must be restricted to one tenant registers its own app
 *     and overrides the URLs.
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
 * **Scopes — the least-privileged set that covers every action in this App.**
 * Verified per-endpoint against the v1.0 reference on 2026-08-03:
 *
 *   | Endpoint family                        | Least privileged (delegated) |
 *   | -------------------------------------- | ---------------------------- |
 *   | `GET /me/todo/lists`, `GET …/tasks`     | `Tasks.Read`                 |
 *   | `POST` / `PATCH` / `DELETE` anything    | `Tasks.ReadWrite`            |
 *   | `…/delta`                               | `Tasks.ReadWrite`            |
 *
 * This App writes, so `Tasks.ReadWrite` is requested and `Tasks.Read` is not —
 * the former is documented as the higher-privileged form of the latter, so one
 * scope covers the whole surface. `Tasks.Read.All` / `Tasks.ReadWrite.All` are
 * the *application* (app-only) permissions and are not requested: this is a
 * delegated flow acting as the signed-in user.
 *
 * `User.Read` is the one addition, and it earns its place: it is what
 * `afterConnect` reads to label the Connection, and Microsoft classes it as a
 * user-consentable, non-admin scope.
 */
import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/** Multi-tenant + personal accounts. See the note on the tenant segment above. */
const TENANT = "common";

export const AUTHORIZATION_URL =
  `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
export const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;

export const SCOPES = [
  "offline_access",
  "User.Read",
  "Tasks.ReadWrite",
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
    "Public OAuth flow. Requires a Microsoft Entra ID app registration (client_id / client_secret / redirect_uri) configured on this w6w installation.",
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
   * `GET /me/todo/lists` — the App's own front door, and the right probe here.
   *
   * The sibling `outlook` App probes `GET /me` instead, deliberately: it holds
   * four scopes, and a credential legitimately missing one of them should not
   * report as broken. This App holds exactly **one** functional scope, and
   * every action needs it — so a credential without `Tasks.ReadWrite` is not
   * "partially useful", it is unusable, and the probe should say so.
   *
   * No query parameters. Microsoft documents this method as supporting only
   * "some of the OData query parameters" without enumerating which, so sending
   * a `$top` to shrink the response would risk a `400` on a credential that is
   * actually fine. A user's task-list collection is small by construction.
   * https://learn.microsoft.com/en-us/graph/api/todo-list-lists
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/me/todo/lists`, {
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
