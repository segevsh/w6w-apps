import type { AuthDefinition, HookContext } from "@w6w/types";
import { API_BASE, SCOPE, TOKEN_PATH } from "../lib/client.ts";

/**
 * OAuth2 Client Credentials (`custom`) — Hostaway's documented "Authentication".
 *
 * Verbatim from the docs' Authentication section: "We use Client Credentials Grant of
 * OAuth 2.0 protocol for API authentication", and the request is
 * `POST https://api.hostaway.com/v1/accessTokens` with an
 * `application/x-www-form-urlencoded` body of four fields:
 *
 *     grant_type=client_credentials&client_id={accountId}&client_secret={secret}&scope=general
 *
 * Two things about that body are worth stating because they are NOT the usual OAuth2
 * shape:
 *
 *   - `client_id` is the numeric **Hostaway account ID** from the Hostaway dashboard,
 *     not an OAuth application id. The field is labelled "Account ID" for that reason.
 *   - `scope` is always literally `general`; the docs list no other value.
 *
 * Success is `200 {"token_type":"Bearer","expires_in":15897600,"access_token":"<JWT>"}`.
 * The docs also say the token lasts "24 months", which contradicts their own example's
 * `expires_in` (15,897,600s ≈ 184 days) — `mintToken` trusts the LIVE `expires_in` and
 * hardcodes neither number, subtracting a minute of clock-skew headroom.
 *
 * `type: "custom"` rather than `"oauth2"`: this pack's `oauth2` type models the
 * browser authorization-code flow (`authorizationUrl` + PKCE), which Hostaway does not
 * use for server-to-server integrations. The exchange is a plain form POST.
 *
 *   exchange — the two pasted secrets -> a live token
 *   refresh  — the same call again (the account id and secret never expire)
 *   sign     — stamps `Authorization: Bearer <accessToken>` on each request
 *   test     — re-runs the exchange. `POST /v1/accessTokens` is the narrowest probe
 *              available: it is the only endpoint every account may call regardless of
 *              account features, and its response never echoes either secret back.
 *
 * Note a documented vendor quirk that no runtime workaround here can remove: "the
 * token will be valid 1 second after being returned", so a mint-then-immediately-call
 * sequence may see a 403 on the very first request. That is Hostaway's behaviour, not
 * this app's.
 */

/** Token endpoint failure shape — RFC 6749 §5.2, verified live with a fabricated id. */
interface TokenErrorBody {
  error?: string;
  error_description?: string;
  message?: string;
}

interface TokenBody extends TokenErrorBody {
  token_type?: string;
  expires_in?: number;
  access_token?: string;
}

async function mintToken(
  ctx: HookContext,
  creds: { accountId: string; clientSecret: string },
): Promise<Record<string, unknown>> {
  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: creds.accountId,
    client_secret: creds.clientSecret,
    scope: SCOPE,
  });
  const res = await ctx.fetch(`${API_BASE}${TOKEN_PATH}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const body = await res.json().catch(() => ({})) as TokenBody;
  if (!res.ok || !body.access_token) {
    throw new Error(
      `Hostaway token request failed (${res.status}): ${
        body.error_description ?? body.error ?? body.message ?? "no access_token in response"
      }`,
    );
  }
  return {
    ...creds,
    tokenType: body.token_type ?? "Bearer",
    accessToken: body.access_token,
    // Trust the live `expires_in`; the docs' "24 months" prose contradicts their own
    // example, so only the response is authoritative. One minute of headroom absorbs
    // clock skew, and the 1-second "not usable instantly" quirk is not modelled.
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 0) - 60) * 1000).toISOString(),
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Client Credentials",
  description: "Paste the Hostaway account ID and the client secret from your Hostaway " +
    "dashboard (Settings > Hostaway API). No browser sign-in, so it works in scheduled runs. " +
    "The account ID is a number — it is the account, not an OAuth app id.",
  fields: [
    { key: "accountId", label: "Account ID", type: "secret", required: true, row: "client" },
    { key: "clientSecret", label: "Client Secret", type: "secret", required: true, row: "client" },
  ],

  /** Turns the pasted account id + secret into a live bearer token at connect time. */
  exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const accountId = String(f.accountId ?? "").trim();
    const clientSecret = String(f.clientSecret ?? "").trim();
    if (!accountId || !clientSecret) {
      throw new Error("Account ID and Client Secret are both required.");
    }
    return mintToken(ctx, { accountId, clientSecret });
  },

  /** Same call again — the account id and secret never expire, only the token does. */
  refresh({ credential }, ctx) {
    const { accountId, clientSecret } = credential as {
      accountId: string;
      clientSecret: string;
    };
    return mintToken(ctx, { accountId, clientSecret });
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * Re-runs the exact client-credentials exchange. `POST /v1/accessTokens` needs no
   * account feature and no scope beyond `general`, and its body carries only the new
   * token — never the pasted credential.
   */
  async test({ credential }, ctx) {
    const { accountId, clientSecret } = credential as {
      accountId?: string;
      clientSecret?: string;
    };
    if (!accountId || !clientSecret) {
      return { ok: false, message: "credential missing accountId or clientSecret — reconnect" };
    }
    try {
      await mintToken(ctx, { accountId, clientSecret });
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  },
};

export default clientCredentials;
