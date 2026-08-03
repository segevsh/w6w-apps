import type { AuthDefinition } from "@w6w/types";
import { API_URL, API_VERSION, API_VERSION_HEADER } from "../lib/client.ts";

/**
 * OAuth 2.0 authorization code — the **only** way to authenticate to Jobber.
 *
 * This was checked rather than assumed. Jobber's App Authorization page opens
 * with the alternative stated as an explicit non-option: "rather than using a
 * static API key, a company admin for each Jobber account must explicitly
 * authorize your app". There is no personal access token, no account API key
 * and no basic-auth fallback anywhere in the Developer Center, including for
 * the "Custom integrations" path that exists precisely for a single account —
 * a private integration still registers an app and still runs this flow. So
 * this app ships one auth method, not two.
 *
 * The client_id / client_secret / redirect_uri live on the w6w server, not in
 * this package.
 *
 * ## Scopes are NOT sent in the authorization request
 *
 * Worth stating because every other OAuth app in this pack does send them.
 * Jobber configures scopes **on the app**, in the Developer Center: "They are
 * configured when creating your app in the Developer Center and are displayed
 * to users on the OAuth authorization page." Jobber's own documented
 * authorization URL carries `response_type`, `client_id`, `redirect_uri`,
 * `state`, `code_challenge` and `code_challenge_method` — and no `scope`.
 *
 * Declaring `scopes` here would therefore be a lie in the honest direction:
 * it would render a list in the connect UI that this app cannot actually
 * request and that Jobber would ignore. The grant is whatever the registered
 * app was configured for. Changing it means editing the app in the Developer
 * Center, and Jobber invalidates the refresh token when that happens ("The app
 * connection is re-authorized after a scope change"), so the Connection has to
 * be reconnected.
 *
 * ## PKCE
 *
 * "Jobber recommends using Proof Key for Code Exchange (PKCE) for every
 * authorization request your app initiates... Jobber only supports the S256
 * challenge method." `pkce: true` is also this field's default; it is set
 * explicitly because the S256-only constraint is worth pinning in code.
 *
 * ## Token lifetimes the host has to respect
 *
 * Access tokens expire after **60 minutes** (`expires_in: 3600`). Refresh
 * tokens are long-lived but rotate: "if Refresh Token Rotation is enabled, a
 * new refresh token" comes back on every refresh and "Always store the returned
 * refresh token, overwriting the previous one." A host that keeps replaying the
 * original refresh token will work until rotation is turned on and then stop.
 * Refresh uses the same `/api/oauth/token` endpoint with
 * `grant_type=refresh_token`, so `refreshUrl` is left unset — it defaults to
 * `tokenUrl`.
 *
 * A refresh token also dies when the admin disconnects the app, when the
 * account churns or downgrades, or when the client secret is regenerated. All
 * of those surface as a failing `test`, and the only cure is reconnecting.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Jobber)",
  description:
    "Authorize a Jobber account. Requires a Jobber app registered in the Jobber Developer Center on this w6w installation; the scopes granted are the ones configured on that app.",
  connectionLabel: "{{account.name}}",
  oauth2: {
    authorizationUrl: "https://api.getjobber.com/api/oauth/authorize",
    tokenUrl: "https://api.getjobber.com/api/oauth/token",
    // No `scopes`: Jobber's authorization request takes no `scope` parameter.
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `{ account { id name } }` — two fields, so two points of query cost, and
   * the cheapest authenticated question Jobber answers.
   *
   * The response has to be checked on both channels. An expired token gives
   * HTTP 401, but a *valid-looking* token with no grant gives HTTP **200** with
   * `errors[{ extensions: { code: "UNAUTHENTICATED" } }]` and
   * `data: { account: null }` — verified on the wire against the live endpoint
   * on 2026-08-03. Testing only `res.ok` would report that as a live
   * credential.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        accept: "application/json",
        [API_VERSION_HEADER]: API_VERSION,
      },
      body: JSON.stringify({ query: "{ account { id name } }" }),
    });

    const body = await res.json().catch(() => ({})) as {
      data?: { account?: { id?: string } | null };
      errors?: Array<{ message?: string }>;
    };
    if (body.errors?.length) {
      return { ok: false, message: body.errors[0]?.message ?? "Jobber rejected the credential" };
    }
    if (!res.ok) return { ok: false, message: `Jobber returned ${res.status}` };
    if (!body.data?.account?.id) return { ok: false, message: "Jobber returned no account" };
    return { ok: true };
  },

  /**
   * Jobber asks for exactly this, and says why: "After receiving a new access
   * token, it is recommended to query the account object to retrieve and store
   * the account's `id` and `name`. This associates the tokens with a specific
   * Jobber account in your system, which is important for tracking connections
   * and handling disconnects correctly."
   *
   * The `APP_DISCONNECT` webhook identifies the account, so without the id
   * stored on the Connection there is no way to know which Connection a
   * disconnect refers to.
   *
   * This hook does not read the credential — the runtime routes it through
   * `sign` — which is why there is no `authorization` header here.
   */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        [API_VERSION_HEADER]: API_VERSION,
      },
      body: JSON.stringify({ query: "{ account { id name industry countryCode } }" }),
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      data?: { account?: unknown };
      errors?: unknown[];
    };
    if (body.errors?.length || !body.data?.account) return {};
    return { account: body.data.account };
  },
};

export default oauth2;
