import type { AuthDefinition, HookContext } from "@w6w/types";
import { API_URL, errorMessage, REVOKE_URL, TOKEN_URL } from "../lib/client.ts";

/**
 * OAuth2 **client credentials** — a User API Key, exchanged for a bearer token.
 *
 * ## Where the credential comes from
 *
 * Kajabi's spec is specific about the mint point: "Your API `client_id` and
 * `client_secret` are available on the [User API Keys]
 * (https://app.kajabi.com/admin/settings/security) section of the Kajabi Admin
 * Portal… Click the 'Create User API Key' button, enter a name (e.g. 'My
 * project'), select the user and permissions, and click 'Create'."
 *
 * Two details from that sentence shape this file. The key is minted **against a
 * user** and **with selected permissions**, so a Connection carries that user's
 * effective authority, not the account's — which is why a 403 is reported here
 * as a distinct, actionable failure rather than folded into "auth failed". And
 * Kajabi says the credential can be rotated or deleted at will, "which will
 * invalidate any access tokens granted with the credentials" — so a stored
 * token can die independently of the client id/secret still being valid.
 *
 * ## `type: "custom"`, not `"oauth2"`
 *
 * The `oauth2` type in this spec models the browser authorization-code flow
 * (`authorizationUrl` + PKCE). This is the machine-to-machine grant: no
 * redirect, no user interaction, so it keeps working in scheduled and
 * background runs. Same shape as the sibling `paypal` app's
 * `client-credentials` auth, which this follows deliberately.
 *
 *   exchange  — client id + secret -> a live access/refresh token pair
 *   refresh   — trades the refresh token for a new pair, falling back to a
 *               fresh client-credentials grant (see below)
 *   sign      — stamps the current access token on each request
 *   test      — probes `GET /v1/me`
 *   afterConnect — labels the Connection with the authenticated user
 *
 * The client id and secret are kept in the stored credential precisely because
 * `refresh` needs a way back when the refresh token itself has expired.
 *
 * ## Three grants are documented; this app uses one, and refuses one
 *
 * Kajabi documents three ways to get a token: `client_credentials`,
 * `refresh_token`, and a **username + password** grant. The third is
 * implemented here as an explicit non-feature.
 *
 * Kajabi itself deprecates it in the same breath as documenting it — "(client
 * credentials is preferred)" — and it is a resource-owner-password grant, the
 * pattern OAuth 2.1 removes outright. It would mean storing a Kajabi operator's
 * actual account password in a Connection, where an API key that can be scoped,
 * named, rotated and revoked already exists and is the vendor's recommendation.
 * Nothing this app does needs authority a User API Key cannot carry. So the
 * password grant is not offered, and `tests/index.test.ts` greps the source to
 * keep `username`/`password` from reappearing as fields.
 *
 * ## `sign` is the only hook that sees the secret
 *
 * `mintToken` is the sole place the client id and secret are read for the
 * network, and it is reached only from `exchange`, `refresh` and `test`. No
 * action can reach it: actions receive an already-signed request. The suite in
 * `tests/index.test.ts` enforces that by scanning every action's source for any
 * mention of a credential, an `Authorization` header or a bearer scheme.
 */

/** The token pair Kajabi returns, per the spec's `oauth_token_response` schema. */
interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

/** What this app persists on the Connection. */
export interface KajabiCredential {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

/**
 * `POST /v1/oauth/token`.
 *
 * The body is `application/x-www-form-urlencoded` — the spec declares only that
 * content type on this operation, and unlike every other endpoint in this API
 * it is *not* JSON:API. This is why the OAuth calls are built by hand here
 * rather than routed through `KajabiClient`, which sets JSON:API headers on
 * everything it sends.
 *
 * The credentials go in the **body**, not in a Basic `Authorization` header:
 * the spec's request schema lists `client_id` and `client_secret` as form
 * properties, and the operation declares no `security`. (The sibling `paypal`
 * app uses Basic for the same grant because PayPal's spec asks for it — the
 * grant type being the same does not make the wire format the same, which is
 * exactly the sort of thing that gets assumed instead of read.)
 *
 * Failures are surfaced verbatim from Kajabi's flat OAuth error envelope,
 * confirmed on the wire 2026-08-03: bogus client id and secret answer **401**
 * with `{"error":"Invalid client credentials"}`, and an empty body answers
 * **400**. Neither the request body nor the credential is ever included in the
 * thrown message.
 */
async function requestToken(
  ctx: HookContext,
  form: Record<string, string>,
): Promise<TokenResponse> {
  const res = await ctx.fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams(form).toString(),
  });

  const text = await res.text().catch(() => "");
  let body: TokenResponse = {};
  try {
    body = text ? JSON.parse(text) as TokenResponse : {};
  } catch {
    body = {};
  }

  if (!res.ok || !body.access_token) {
    const detail = errorMessage(text);
    throw new Error(
      `Kajabi token request failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  return body;
}

/**
 * Fold a token response into the stored credential.
 *
 * `expiresAt` is recorded so the host can refresh *before* Kajabi starts
 * answering 401. Kajabi publishes `expires_in` on the response but documents no
 * fixed lifetime, so the value is taken from the response rather than assumed;
 * the fallback only applies if the field is missing entirely, and the 60-second
 * haircut absorbs clock skew between this host and Kajabi regardless of the
 * actual TTL.
 *
 * `refresh_token` is preserved from the previous credential when a response
 * omits it, so a refresh that returns only an access token does not silently
 * strip the connection's ability to refresh again.
 */
function foldToken(
  base: { clientId: string; clientSecret: string; refreshToken?: string },
  body: TokenResponse,
): Record<string, unknown> {
  return {
    clientId: base.clientId,
    clientSecret: base.clientSecret,
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? base.refreshToken,
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 3600) - 60) * 1000).toISOString(),
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "User API Key",
  description: "Create a User API Key at Settings → Security in the Kajabi admin portal " +
    "(app.kajabi.com/admin/settings/security), then paste its Client ID and Client Secret. " +
    "The key is scoped to the user and permissions you pick when creating it. No browser " +
    "sign-in, so it keeps working in scheduled runs. Requires a plan that includes the " +
    "Public API.",
  connectionLabel: "{{user.name}}",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
      hint: "Settings → Security → User API Keys → Create User API Key.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
      hint: "Shown once at creation. Rotating or deleting the key invalidates every token " +
        "already granted with it.",
    },
  ],

  /** Turns the pasted client id and secret into a live token pair at connect time. */
  async exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const clientId = String(f.clientId ?? "").trim();
    const clientSecret = String(f.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    const body = await requestToken(ctx, {
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });
    return foldToken({ clientId, clientSecret }, body);
  },

  /**
   * Renew an expired access token.
   *
   * The refresh-token grant is tried first, because that is what Kajabi
   * documents it for and it is the cheaper, narrower call. But the refresh
   * token is itself "a unexpired JWT token" (the spec's wording) with its own
   * lifetime, and Kajabi invalidates both tokens when the API key is rotated.
   * So a failure falls back to a fresh `client_credentials` grant rather than
   * surfacing as a dead Connection: the client id and secret are still stored
   * and are still the authority: re-minting is exactly what the vendor's own
   * "client credentials is preferred" guidance points at.
   *
   * If both fail the error propagates — at that point the key really has been
   * revoked or the permissions removed, and the operator has to act.
   */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<KajabiCredential>;
    const clientId = cred.clientId ?? "";
    const clientSecret = cred.clientSecret ?? "";
    if (!clientId || !clientSecret) {
      throw new Error("credential is missing clientId or clientSecret — reconnect");
    }

    if (cred.refreshToken) {
      try {
        const body = await requestToken(ctx, {
          grant_type: "refresh_token",
          refresh_token: cred.refreshToken,
        });
        return foldToken({ clientId, clientSecret, refreshToken: cred.refreshToken }, body);
      } catch {
        // Refresh token expired or invalidated by a key rotation. Fall through
        // and re-mint from the credentials we still hold.
      }
    }

    const body = await requestToken(ctx, {
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });
    return foldToken({ clientId, clientSecret }, body);
  },

  /** The only hook that stamps the token. Runs network-less. */
  sign({ request, credential }) {
    const { accessToken } = credential as Partial<KajabiCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * `GET /v1/me` — the whoami probe.
   *
   * ## Why this endpoint, and why reading its response body mattered
   *
   * The rule this pack learned the hard way is that a probe must be chosen by
   * reading what it *returns*, not by what it is called: Follow Up Boss's
   * `/me` hands back the caller's own API key, and Mailjet's `/apikey` returns
   * the key and the secret. A `/me` route is therefore guilty until proven
   * innocent.
   *
   * Kajabi's is innocent, and the spec is explicit enough to prove it. The
   * `me_response` schema is `{ data: { id, type, attributes } }` where
   * `me_attributes` is documented, field by field, as exactly four things:
   * `initials`, `name`, `email` and `role_level`. There is no token, key,
   * secret or credential field in the schema — and because this document is
   * generated from the Kajabi application rather than hand-written, an
   * undocumented extra attribute is not the likely failure mode it would be
   * with prose docs.
   *
   * ## Why not a collection
   *
   * Every alternative is a listing (`/v1/contacts`, `/v1/sites`), and each has
   * the same two problems: it drags customer PII across the wire purely to
   * prove a token works, and it reports a *working* credential as broken the
   * moment the API key's selected permissions exclude that resource. `/v1/me`
   * describes the key's own user, so no permission selection can withhold it.
   *
   * ## The three failures it separates
   *
   * 401 — token wrong, expired, or the key was rotated or deleted.
   * 403 — the token is fine but the key's permissions (or the account's plan)
   *       do not cover this; a different fix entirely, so it gets its own
   *       message rather than being flattened into "auth failed".
   * anything else — Kajabi itself, reported with the status.
   *
   * Verified on the wire 2026-08-03: no `Authorization` header and a bogus
   * bearer token both produce a real **401** with the JSON:API error envelope,
   * not a 200 carrying an error object. So `res.status` can be trusted here.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<KajabiCredential>;
    if (!cred?.accessToken) {
      return { ok: false, message: "credential missing an access token — reconnect" };
    }

    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: {
        accept: "application/vnd.api+json",
        authorization: `Bearer ${cred.accessToken}`,
      },
    });

    if (res.status === 401) {
      const detail = errorMessage(await res.text().catch(() => ""));
      return {
        ok: false,
        message: `Kajabi rejected the token (401${detail ? `: ${detail}` : ""}). The access ` +
          "token may have expired, or the User API Key was rotated or deleted — rotating a " +
          "key invalidates every token granted with it.",
      };
    }
    if (res.status === 403) {
      const detail = errorMessage(await res.text().catch(() => ""));
      return {
        ok: false,
        message: detail ||
          "Kajabi returned 403 — the token authenticated, but this User API Key's permissions " +
            "do not cover the request. Check the permissions selected on the key, and that " +
            "the account's plan includes the Public API.",
      };
    }
    if (!res.ok) return { ok: false, message: `Kajabi returned HTTP ${res.status}` };
    return { ok: true };
  },

  /**
   * Labels the Connection with the user the API key was minted against.
   *
   * A Kajabi client id is an opaque string, so there is nothing readable in the
   * credential itself to name a Connection by — the name has to be fetched.
   * This reuses the exact call `test` makes, so it adds no new endpoint and no
   * new failure mode, and it returns `{}` rather than throwing if anything goes
   * wrong: a missing label must never block a Connection that authenticates.
   *
   * Only `name`, `email` and `role_level` are echoed. They are the whole of
   * what identifies the key's user, and `role_level` in particular is worth
   * surfacing — an `OWNER` key and a restricted key look identical in the UI
   * otherwise, right up until an action 403s.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<KajabiCredential>;
    if (!cred?.accessToken) return {};

    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: {
        accept: "application/vnd.api+json",
        authorization: `Bearer ${cred.accessToken}`,
      },
    });
    if (!res.ok) return {};

    const body = await res.json().catch(() => null) as {
      data?: { id?: string; attributes?: { name?: string; email?: string; role_level?: string } };
    } | null;
    const attrs = body?.data?.attributes;
    if (!attrs?.name && !attrs?.email) return {};

    return {
      user: {
        id: body?.data?.id,
        name: attrs.name,
        email: attrs.email,
        roleLevel: attrs.role_level,
      },
    };
  },

  /**
   * `POST /v1/oauth/revoke` — "log out" when the Connection is deleted.
   *
   * Kajabi: "Either token may be provided… Both tokens we be invalidated"
   * [sic]. Worth doing rather than letting the token lapse: a token that
   * outlives the Connection is a live credential nobody is watching.
   *
   * Never throws. A disconnect must succeed locally even if Kajabi is
   * unreachable — otherwise a user cannot remove a Connection during an
   * outage, which is precisely when they might most want to.
   */
  async revoke({ credential }, ctx) {
    const cred = credential as Partial<KajabiCredential>;
    const token = cred?.accessToken;
    if (!token) return;
    try {
      await ctx.fetch(REVOKE_URL, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Bearer ${token}`,
        },
        body: new URLSearchParams({ token }).toString(),
      });
    } catch {
      // Best effort — the Connection is going away regardless.
    }
  },
};

export default clientCredentials;
