import type { AuthDefinition } from "@w6w/types";
import { errorOf, TOKEN_URL } from "../lib/client.ts";
import { probeToken } from "./access-token.ts";

/**
 * An OAuth app's `client_id` / `client_secret`, exchanged for a bearer token.
 *
 * ## What is verified, and what is not
 *
 * `POST https://rest.cleverreach.com/oauth/token.php` is the vendor's token endpoint (the
 * authentication guide documents the refresh grant against it). Probed 2026-10-06 without a real
 * key: `grant_type=client_credentials` is a SUPPORTED grant (a bogus grant answers
 * `unsupported_grant_type`, this one answers `invalid_client`), and the endpoint accepts the id and
 * secret in the form body or in HTTP Basic. The vendor's guide documents only the authorization-code
 * flow, so the success body (`access_token`, `expires_in`) is taken from its sample response and
 * could not be confirmed against a live key.
 *
 * ## Classification
 *
 * A bad pair is `400 {"error":"invalid_client",…}` — read from the body's `error`.
 */
const auth: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "OAuth app (client credentials)",
  connectionLabel: "CleverReach — {{clientId}}",
  description:
    "The Client ID and Client Secret of an OAuth app (Account → Extras → REST API). The app " +
    "exchanges them for an access token and renews it before it expires.",
  fields: [
    { key: "clientId", label: "Client ID", type: "string", required: true },
    { key: "clientSecret", label: "Client secret", type: "secret", required: true },
  ],

  async exchange({ fields }, ctx) {
    const values = fields as Record<string, unknown>;
    const clientId = String(values?.clientId ?? "").trim();
    const clientSecret = String(values?.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) {
      throw new Error("`clientId` and `clientSecret` are both required");
    }
    return { clientId, clientSecret, ...(await mint(clientId, clientSecret, ctx.fetch)) };
  },

  async refresh({ credential }, ctx) {
    const c = credential as Record<string, unknown>;
    const token = await mint(String(c?.clientId ?? ""), String(c?.clientSecret ?? ""), ctx.fetch);
    return { ...c, ...token };
  },

  // The only code handed the credential. Network-less: stamp and return.
  sign({ request, credential }) {
    const accessToken = String((credential as Record<string, unknown>)?.accessToken ?? "");
    return {
      ...request,
      headers: { ...request.headers, authorization: `Bearer ${accessToken}` },
    };
  },

  async test({ credential }, ctx) {
    return await probeToken(
      String((credential as Record<string, unknown>)?.accessToken ?? ""),
      ctx,
    );
  },

  afterConnect({ credential }) {
    return { clientId: String((credential as Record<string, unknown>)?.clientId ?? "") };
  },
};

/** `POST /oauth/token.php`, form-encoded, `grant_type=client_credentials`. */
async function mint(
  clientId: string,
  clientSecret: string,
  fetchImpl: (input: string, init?: RequestInit) => Promise<Response>,
): Promise<{ accessToken: string; expiresAt: string }> {
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });
  const text = await res.text().catch(() => "");

  let token: { access_token?: string; expires_in?: number | string } = {};
  try {
    token = JSON.parse(text);
  } catch { /* handled below */ }

  // The body's own error code decides; the status is only a hint.
  const err = errorOf(token);
  if (err !== undefined) {
    const hint = (token as { error?: string }).error === "invalid_client"
      ? " — the client id/secret pair was rejected: check both, and that the OAuth app still exists"
      : "";
    throw new Error(`CleverReach refused the token request (${res.status} ${err})${hint}`);
  }
  if (!res.ok) throw new Error(`CleverReach ${res.status} minting a token: ${text.slice(0, 160)}`);
  if (!token.access_token) throw new Error("CleverReach returned no `access_token`");

  // `expires_in` is seconds; renew 2 minutes early. Absent → assume an hour, the cautious side.
  const seconds = Number(token.expires_in ?? 3600) || 3600;
  const early = Math.max(60, seconds - 120);
  return {
    accessToken: token.access_token,
    expiresAt: new Date(Date.now() + early * 1000).toISOString(),
  };
}

export default auth;
