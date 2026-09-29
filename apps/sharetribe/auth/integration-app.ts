import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, AUTH_BASE, AUTH_TOKEN_PATH } from "../lib/client.ts";

/**
 * A Sharetribe **Integration API application**'s client ID + client secret, exchanged for a
 * bearer access token via the OAuth2 `client_credentials` grant against the Authentication API.
 *
 * Verified 2026-09-29 against `sharetribe.com/api-reference/authentication.html` and live
 * probes against `flex-api.sharetribe.com` and `flex-integ-api.sharetribe.com`.
 *
 * ## Why the Integration API, and not the Marketplace API
 *
 * Sharetribe's reference documents two API surfaces with two different authentication shapes,
 * and only one of them fits a workflow-host credential:
 *
 * - **Marketplace API** — what a marketplace's own web/mobile client authenticates against, as
 *   *one logged-in marketplace user* (`grant_type=password`, a real end user's email+password)
 *   or anonymously (`grant_type=client_credentials` with only a public client ID, scope
 *   `public-read`). Modelling "connect as this one end user" as a Connection would mean storing
 *   a marketplace shopper's own password — the wrong shape for an operator-facing integration.
 * - **Integration API** — "trusted secure applications … your own backend systems … authorized
 *   marketplace operators" (the vendor's own words), authenticated with an Integration API
 *   application's `client_id` **and** `client_secret` via `grant_type=client_credentials`,
 *   `scope=integ`. This is exactly the machine-credential shape a workflow host wants, and it is
 *   what this app covers.
 *
 * ## No refresh token from `client_credentials` alone — but Sharetribe's docs say there is one
 *
 * Unlike Auth0's Management API (`client_credentials`, no refresh token — see this pack's
 * `auth0` app), Sharetribe's own docs list `refresh_token` as present in the response "when
 * grant_type is password or client_credentials **with a client_secret**" — which the
 * Integration API grant always has. `refresh` below uses it via `grant_type=refresh_token`,
 * per the vendor's explicit recommendation ("reduces the number of HTTP requests in which your
 * long-lived application secret is used"); `exchange` falls back to a fresh
 * `client_credentials` grant only if a stored credential somehow has no refresh token.
 *
 * ## The probe is `GET marketplace/show`
 *
 * Sharetribe's Integration API has no per-application scoping narrower than "is this a valid
 * Integration API credential" — unlike Apify or CloudConvert, there is no documented concept of
 * a partially-scoped Integration API token. `marketplace/show` is the cheapest read that proves
 * the token: it needs a credential, returns only the marketplace's public `name`/`description`
 * (nothing secret), and is the account-level endpoint Sharetribe's own reference example curls
 * first. Measured live 2026-09-29: an unauthenticated request answers
 * `401 {"errors":[{"code":"auth-missing-access-token",...}]}`, and a syntactically-plausible but
 * wrong bearer token answers `401 {"errors":[{"code":"auth-invalid-access-token",...}]}` — the
 * two are distinguishable, unlike CloudConvert's identical-either-way `UNAUTHENTICATED`.
 */

export interface SharetribeCredential {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
}

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

/** POST a `application/x-www-form-urlencoded` body to the Authentication API's token endpoint. */
async function postToken(
  ctx: Parameters<NonNullable<AuthDefinition["refresh"]>>[1],
  form: Record<string, string>,
): Promise<TokenResponse> {
  const res = await ctx.fetch(`${AUTH_BASE}${AUTH_TOKEN_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=utf-8",
      accept: "application/json",
    },
    body: new URLSearchParams(form).toString(),
  });
  const text = await res.text();
  let body: TokenResponse = {};
  try {
    body = text ? JSON.parse(text) as TokenResponse : {};
  } catch {
    // The token endpoint answers plain-text "Unauthorized" (not JSON) on a bad client_id/secret
    // — measured live 2026-09-29 — so a parse failure on a non-ok response is expected, not a bug.
  }
  if (!res.ok || !body.access_token) {
    const reason = body.error_description ?? body.error ?? text.trim() ?? `HTTP ${res.status}`;
    throw new Error(
      `Sharetribe refused to issue an Integration API token (${reason || `HTTP ${res.status}`}). ` +
        "Check the Client ID and Client Secret against Console > Advanced > Applications.",
    );
  }
  return body;
}

function toCredential(
  base: { clientId: string; clientSecret: string },
  token: TokenResponse,
): SharetribeCredential {
  return {
    ...base,
    accessToken: token.access_token!,
    refreshToken: token.refresh_token,
    // A minute of headroom absorbs clock skew and the round trip itself.
    expiresAt: new Date(Date.now() + ((token.expires_in ?? 300) - 60) * 1000).toISOString(),
  };
}

const integrationApp: AuthDefinition = {
  key: "integration-app",
  type: "custom",
  displayName: "Integration API Application",
  description: "An Integration API application's Client ID and Client Secret, from Sharetribe " +
    "Console > Advanced > Applications. This authenticates as the whole marketplace's trusted " +
    "backend integration, not as any one marketplace user.",
  connectionLabel: "{{marketplaceName}}",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
      hint: "Console > Advanced > Applications > your Integration API application.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
    },
  ],

  /** Mint the first access token. */
  exchange({ fields }, ctx) {
    const { clientId, clientSecret } = (fields ?? {}) as Record<string, string>;
    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    return postToken(ctx, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "integ",
    }).then((token) => toCredential({ clientId, clientSecret }, token));
  },

  /** Prefer `refresh_token`, per Sharetribe's own guidance; fall back to a fresh grant. */
  refresh({ credential }, ctx) {
    const cred = credential as SharetribeCredential;
    const base = { clientId: cred.clientId, clientSecret: cred.clientSecret };
    const request = cred.refreshToken
      ? postToken(ctx, { grant_type: "refresh_token", refresh_token: cred.refreshToken })
      : postToken(ctx, {
        client_id: cred.clientId,
        client_secret: cred.clientSecret,
        grant_type: "client_credentials",
        scope: "integ",
      });
    return request.then((token) => toCredential(base, token));
  },

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const { accessToken } = credential as SharetribeCredential;
    request.headers["authorization"] = `bearer ${accessToken}`;
    return request;
  },

  /** See the module doc's "The probe is `GET marketplace/show`" section. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<SharetribeCredential>;
    if (!cred?.accessToken) {
      return { ok: false, message: "credential has no accessToken — reconnect" };
    }

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/marketplace/show`, {
      headers: { accept: "application/json", authorization: `bearer ${cred.accessToken}` },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { errors?: Array<{ code?: string; title?: string }> }
      | null;
    const code = body?.errors?.[0]?.code;

    if (code === "auth-missing-access-token") {
      return {
        ok: false,
        message: "Sharetribe received no access token. The credential did not reach the " +
          "request — reconnect this connection.",
      };
    }
    if (code === "auth-invalid-access-token" || res.status === 401) {
      return {
        ok: false,
        message: `Sharetribe rejected the access token (401${code ? ` ${code}` : ""}). It may ` +
          "have expired without a working refresh, or the Client ID/Secret may have been " +
          "revoked in Console > Advanced > Applications.",
      };
    }
    return {
      ok: false,
      message: `Sharetribe returned HTTP ${res.status} for marketplace/show${
        body?.errors?.[0]?.title ? `: ${body.errors[0].title}` : ""
      }`,
    };
  },

  /**
   * Publish the marketplace's own name for the connection label.
   *
   * Reuses the same call `test` just made rather than a second one — `marketplace/show`
   * returns only `name`/`description`, nothing secret. A failure here is deliberately silent:
   * `test` already established the token works, and a missing display label must not fail a
   * good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<SharetribeCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/marketplace/show`, {
        headers: { accept: "application/json", authorization: `bearer ${cred.accessToken ?? ""}` },
      });
      if (!res.ok) return {};
      const body = await res.json() as { data?: { attributes?: { name?: string } } };
      const marketplaceName = body?.data?.attributes?.name;
      return marketplaceName ? { marketplaceName } : {};
    } catch {
      return {};
    }
  },
};

export default integrationApp;
