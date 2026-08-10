import type { AuthDefinition } from "@w6w/types";
import { ACCOUNT_LABEL_QUERY, accountLabel, IDENTITY_PROBE_QUERY, probe } from "../lib/identity.ts";

/**
 * OAuth 2.0 Authorization Code + PKCE — connect a *user's* Buffer account
 * rather than pasting your own key.
 *
 * ## Why this exists alongside `api-key`
 *
 * The two methods answer different questions and neither substitutes for the
 * other. A personal API key is one string that acts for the account that minted
 * it — fine for your own automations, useless for a product that schedules on
 * behalf of other people's Buffer accounts. OAuth is the multi-tenant route,
 * and it is self-serve: *"Visit Settings → API to register your app"*
 * (<https://developers.buffer.com/guides/authentication.html>, fetched
 * 2026-08-03). The rate-limit table budgets for it explicitly — "App Clients:
 * 1" on Free, 3 on Essentials, 5 on Team.
 *
 * This is the part of Buffer's developer story that was shut for years. Buffer
 * itself frames the new API as shipping *"managed OAuth"*
 * (<https://buffer.com/resources/legacy-rest-api-retired/>), and registering a
 * client no longer requires an application to Buffer.
 *
 * ## Endpoints, verified on the wire
 *
 * `auth.buffer.com`, not `api.buffer.com` — the authorization server is a
 * separate host from the GraphQL API. Probed 2026-08-03:
 *
 *   | Request                                                    | Result                                                                 |
 *   | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
 *   | `GET /auth` with no params                                 | `302` → `/error?…&error_description=missing%20required%20parameter%20'client_id'` |
 *   | `GET /auth?client_id=zzz&…&code_challenge_method=S256`     | `302` → `/error?…&error_description=client%20is%20invalid`               |
 *   | `POST /token` `grant_type=authorization_code` bogus client | `{"error":"invalid_client","error_description":"client authentication failed"}` |
 *
 * Both endpoints are live and behave exactly as the guide describes: the
 * authorization endpoint validates parameters in the documented order, and the
 * token endpoint returns the RFC 6749 `error` / `error_description` envelope.
 * A closed or vestigial OAuth deployment does not answer like that.
 *
 * `auth.buffer.com` is deliberately absent from `w6w.network.allow`: the
 * auditor derives OAuth hosts from `authorizationUrl`/`tokenUrl` and adds them
 * itself, and no action in this app has business calling the authorization
 * server directly.
 *
 * ## PKCE is not optional
 *
 * `pkce` is left at the type's `true` default, and that is the correct value
 * rather than an accident: Buffer describes the Authorization Code flow with
 * PKCE as *"required for all Buffer OAuth clients"*, documents
 * `code_challenge_method=S256`, and says public clients *"authenticate using
 * PKCE alone"*. The sibling `linkedin` app sets `pkce: false` explicitly
 * because LinkedIn's documented requests carry no challenge at all; the
 * opposite is true here, so the default stands.
 *
 * ## Scopes
 *
 * All seven Buffer publishes, taken verbatim from the guide's table:
 * `posts:read`, `posts:write`, `ideas:read`, `ideas:write`, `account:read`,
 * `account:write`, `offline_access`. Separator is a space — Buffer's own
 * example authorization URL is
 * `scope=posts:write posts:read ideas:read ideas:write account:read account:write offline_access`.
 *
 * `offline_access` is requested because it is the only way to get a refresh
 * token: *"Long-lived token used to obtain a new `access_token`. Only returned
 * if the `offline_access` scope is requested."* Access tokens are short —
 * `expires_in: 3600` in Buffer's own sample response — so without it a
 * Connection would break an hour after it was made.
 *
 * `account:write` is included although nothing in this app writes account
 * settings, because Buffer's authorization request is all-or-nothing per
 * client: the consent screen shows what the *app* asked for, and narrowing the
 * list here would not narrow what a user could later be asked to grant. It is
 * noted rather than hidden.
 *
 * ## Refresh tokens are single-use, and Buffer warns about it in bold
 *
 *   > ⚠️ Refresh tokens are single-use. Every successful refresh returns a new
 *   > `refresh_token` and invalidates the one you sent. Always save the latest
 *   > refresh token and discard the old one. **Reusing an old refresh token
 *   > revokes all tokens for that grant** — your user will need to
 *   > re-authorize.
 *
 * No custom `refresh` hook is declared. The runtime's built-in handler does the
 * standard `grant_type=refresh_token` POST against `tokenUrl` and stores what
 * comes back, which is exactly the rotate-and-replace behaviour Buffer
 * requires. A bespoke hook here would be a second implementation of the one
 * thing that must not be got wrong.
 *
 * ## What is NOT in this package
 *
 * `client_id`, `client_secret` and `redirect_uri`. They live on the w6w server
 * (`PUT /apps/:id/oauth-config/oauth2`), never in an app. Buffer distinguishes
 * confidential clients (which get a secret) from public ones (which get only a
 * `client_id` and rely on PKCE); a w6w host is a confidential client, since the
 * exchange happens server-side.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Connect Buffer account)",
  description:
    "Authorize a Buffer account through Buffer's hosted consent screen. Requires an OAuth " +
    "client registered at **Settings → API** in Buffer; PKCE is mandatory. Access tokens last " +
    "one hour and are refreshed automatically via the `offline_access` scope.",
  connectionLabel: "{{account.name}}",
  oauth2: {
    authorizationUrl: "https://auth.buffer.com/auth",
    tokenUrl: "https://auth.buffer.com/token",
    scopes: [
      "posts:read",
      "posts:write",
      "ideas:read",
      "ideas:write",
      "account:read",
      "account:write",
      "offline_access",
    ],
    scopeSeparator: " ",
  },

  /**
   * Declared even though `type: "oauth2"` lets the runtime sign, because the
   * pack's audit rule wants every method to state its wire format and because
   * the format is worth being explicit about: Buffer's Step 5 example is
   * `Authorization: Bearer ${tokens.access_token}` against `api.buffer.com` —
   * the same header shape the API-key method uses, over a different token.
   */
  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * The same `{ account { id } }` probe the API-key method uses, with no
   * headers of its own — `ctx.fetch` is signed by the runtime for an oauth2
   * Connection.
   *
   * Buffer's revocation story is why this matters more here than for a key:
   * *"Users can revoke your app from their Buffer account settings at any time.
   * When access is revoked, all tokens for your app are invalidated. Handle 401
   * Unauthorized responses by prompting the user to re-authorize."* A revoked
   * grant therefore looks exactly like a bad key on the wire, and `probe`
   * reports it as a credential failure — which is the right verdict, because
   * the fix in both cases is "connect again".
   */
  async test(_input, ctx) {
    return await probe(ctx, IDENTITY_PROBE_QUERY, {});
  },

  async afterConnect(_input, ctx) {
    return await accountLabel(ctx, ACCOUNT_LABEL_QUERY, {});
  },
};

export default oauth2;
