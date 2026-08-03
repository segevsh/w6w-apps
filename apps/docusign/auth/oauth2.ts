import type { AuthDefinition } from "@w6w/types";
import {
  assertAllowedHost,
  AUTH_HOST,
  AUTHORIZE_PATH,
  type Environment,
  normalizeBaseUri,
  selectAccount,
  TOKEN_PATH,
  type UserInfo,
  USERINFO_PATH,
  userInfoUrl,
} from "../lib/client.ts";

/**
 * Confidential Authorization Code Grant against Docusign's authentication
 * service.
 *
 * Verified against Docusign's own reference on 2026-08-03:
 *
 *   - `developers.docusign.com/platform/auth/authcode/` — Docusign supports two
 *     Authorization Code Grant variants: **Confidential** (server-hosted, holds
 *     a secret key) and **Public** (PKCE, no secret). This host stores the
 *     integration key + secret, so it is the confidential client. The same page
 *     states PKCE is *optionally* available on the confidential flow ("You can
 *     optionally include a Proof Key for Code Exchange (PKCE) challenge to add
 *     an additional layer of security"), so `pkce: true` — it is strictly
 *     better and Docusign accepts it.
 *   - `developers.docusign.com/platform/auth/reference/obtain-consent/` —
 *     `GET {auth host}/oauth/auth?response_type=code&scope=…&client_id=…&state=…&redirect_uri=…`.
 *   - `developers.docusign.com/platform/auth/reference/obtain-access-token/` —
 *     `POST {auth host}/oauth/token`, `grant_type=authorization_code`,
 *     `Content-Type: application/x-www-form-urlencoded`, and the integration
 *     key + secret sent as HTTP Basic. The same endpoint takes
 *     `grant_type=refresh_token`, which is why `refreshUrl` is the same URL.
 *   - `developers.docusign.com/platform/auth/reference/scopes/` — `signature`
 *     is "Required to call most eSignature REST API endpoints"; `extended`
 *     makes each refresh issue a refresh token with a *full* lifetime
 *     (typically 30 days) instead of one inheriting the original expiry, which
 *     is what keeps a long-lived server integration alive. `impersonation` is
 *     deliberately absent: it belongs to the JWT Grant flow, not this one.
 *
 * **No `revokeUrl`.** Docusign publishes `{auth host}/logout`
 * (`developers.docusign.com/platform/auth/reference/logout/`), but that is a
 * *browser* SSO logout that ends a user's authentication session and takes
 * `client_id` / `redirect_uri` / `response_mode` query parameters — it is not
 * an OAuth token-revocation endpoint and cannot be called server-side with a
 * token. Claiming it as `revokeUrl` would be asserting a capability Docusign
 * does not offer, so this app leaves it out.
 *
 * **Where `baseUri` and `accountId` come from.** See `lib/client.ts` — they are
 * discovered once in `afterConnect` from `GET /oauth/userinfo` and recorded on
 * the Connection's `display`. Actions never re-derive them.
 *
 * **Production versus developer.** `OAuth2Config.authorizationUrl` and
 * `tokenUrl` are static strings in this spec, and the environment has to be
 * decided *before* the browser redirect — so it cannot be a form field. This
 * factory builds one auth method per environment; `auth/oauth2-demo.ts` is the
 * developer-environment sibling. They are separate Docusign systems with
 * separate accounts and separate integration keys, so a Connection belongs to
 * exactly one of them.
 */
export function createDocusignOAuth(environment: Environment): AuthDefinition {
  const host = AUTH_HOST[environment];
  const isDemo = environment === "demo";

  return {
    key: isDemo ? "oauth2-demo" : "oauth2",
    type: "oauth2",
    displayName: isDemo ? "OAuth (Developer Sandbox)" : "OAuth (Production)",
    description: isDemo
      ? "Docusign developer environment (account-d.docusign.com / demo.docusign.net). " +
        "Requires an integration key registered on a Docusign developer account."
      : "Docusign production (account.docusign.com). Requires an integration key registered " +
        "on this w6w installation with a matching redirect URI.",
    connectionLabel: "{{accountName}} ({{environment}})",
    fields: [
      {
        key: "accountId",
        label: "Account ID",
        type: "string",
        hint:
          "Optional. Leave blank to use the login's default Docusign account. Set it only when " +
          "the login belongs to several accounts and you want a specific one — it is the " +
          "API Account ID GUID shown in Docusign under Settings → Apps and Keys.",
      },
    ],
    oauth2: {
      authorizationUrl: `https://${host}${AUTHORIZE_PATH}`,
      tokenUrl: `https://${host}${TOKEN_PATH}`,
      refreshUrl: `https://${host}${TOKEN_PATH}`,
      scopes: ["signature", "extended"],
      pkce: true,
    },

    sign({ request, credential }) {
      const { accessToken } = credential as { accessToken: string };
      request.headers["authorization"] = `Bearer ${accessToken}`;
      return request;
    },

    /**
     * `GET /oauth/userinfo` — the scope-free whoami.
     *
     * Chosen over any eSignature read because it is the narrowest thing a valid
     * token can always reach: it needs no scope, no account id and no regional
     * host, so it answers "is this credential live" without ever reporting a
     * working connection as broken because of a missing permission. The one
     * cost is that Docusign rate-limits userinfo per user id and per
     * integration key hourly, so a host should not poll the derived
     * `auth:oauth2` health check aggressively.
     */
    async test({ credential }, ctx) {
      const { accessToken } = credential as { accessToken?: string };
      if (!accessToken) return { ok: false, message: "credential has no accessToken" };
      const res = await ctx.fetch(userInfoUrl(environment), {
        headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
      });
      if (!res.ok) {
        await res.body?.cancel();
        return { ok: false, message: `Docusign ${host}${USERINFO_PATH} returned ${res.status}` };
      }
      const info = await res.json().catch(() => ({})) as UserInfo;
      if (!info.accounts?.length) {
        return { ok: false, message: "token is valid but reaches no Docusign account" };
      }
      return { ok: true };
    },

    /**
     * Resolve the account this Connection acts on, and record the two facts
     * every action needs: its regional `base_uri` and its `account_id`.
     *
     * Docusign's own guidance is to cache this response "at least for your
     * application's entire session" because it changes only when a user is
     * added to or removed from an account — so it is fetched here, once, rather
     * than on every call.
     */
    async afterConnect({ credential }, ctx) {
      const { accessToken, accountId } = credential as {
        accessToken?: string;
        accountId?: string;
      };
      if (!accessToken) return { environment };

      const res = await ctx.fetch(userInfoUrl(environment), {
        headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
      });
      if (!res.ok) {
        await res.body?.cancel();
        throw new Error(
          `Docusign ${host}${USERINFO_PATH} returned ${res.status} — cannot resolve the ` +
            `account's API base URI, so no action would be able to build a request URL.`,
        );
      }
      const info = await res.json().catch(() => ({})) as UserInfo;
      const account = selectAccount(info, accountId);
      const baseUri = normalizeBaseUri(account.base_uri!);
      assertAllowedHost(baseUri);

      return {
        environment,
        baseUri,
        accountId: account.account_id!,
        accountName: account.account_name,
        isDefaultAccount: account.is_default === true,
        userName: info.name,
        email: info.email,
      };
    },
  };
}

export default createDocusignOAuth("production");
