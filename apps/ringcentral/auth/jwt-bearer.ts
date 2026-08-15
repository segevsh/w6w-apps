import type { AuthDefinition, HookContext } from "@w6w/types";
import { OAUTH_TOKEN_URL } from "../lib/client.ts";
import { probeCredential, whoAmIDisplay } from "./_shared.ts";

/**
 * JWT Bearer grant (`custom`) — the server-app flow the task brief asked to
 * evaluate against "what the app can actually use from a sandbox".
 *
 * ## What "JWT" means here — and why this app does not sign one
 *
 * RingCentral's OAuth token endpoint documents a `urn:ietf:params:oauth:grant-type:jwt-bearer`
 * grant (`components.schemas.JwtTokenRequest`, `discriminator.mapping` on
 * `GetTokenRequest`). Unlike a typical RFC-7523 JWT-bearer flow, the
 * `assertion` is **not** a JWT this app mints and signs with a private key —
 * it is a long-lived, opaque **JWT credential string** the account owner
 * mints once, by hand, in RingCentral's Developer Console ("Auth Credentials"
 * for a Server/Bot application), and pastes in below. That is exactly what a
 * network-less credential sandbox can use: no signing key ever needs to exist
 * in this app, because RingCentral did the signing when it issued the
 * credential.
 *
 * The wire exchange is a plain form POST, confidential-client style, with the
 * app's own Client ID/Secret in the `Authorization: Basic` header (per
 * `GetTokenRequest`'s "confidential client application types" note) and the
 * pasted JWT as `assertion`:
 *
 *     POST /restapi/oauth/token
 *     Authorization: Basic base64(clientId:clientSecret)
 *     Content-Type: application/x-www-form-urlencoded
 *
 *     grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<jwt>
 *
 * ## No browser round-trip, so it works in scheduled/background runs
 *
 * This is the property `oauth2.ts` cannot offer: minting a fresh access token
 * needs only the three pasted values, at any time, with no end user present —
 * exactly what a workflow trigger firing at 3 AM needs. It mirrors this pack's
 * `zoom/auth/server-to-server.ts`: `exchange` turns the pasted values into a
 * live token at connect time, `refresh` repeats the same call when the token
 * expires, and `sign` stamps whatever token is currently stored. The pasted
 * JWT itself does not expire on RingCentral's normal cadence the way an access
 * token does — Developer Console describes it as valid until revoked — so
 * `refresh` re-minting from it is the same "the credential never expires, only
 * the token does" shape as Zoom's account credentials.
 */
async function mintToken(
  ctx: HookContext,
  creds: { jwtToken: string; clientId: string; clientSecret: string },
): Promise<Record<string, unknown>> {
  const res = await ctx.fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${creds.clientId}:${creds.clientSecret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: creds.jwtToken,
    }).toString(),
  });
  const body = await res.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(
      `RingCentral JWT token request failed (${res.status}): ${
        body.error_description ?? body.error ?? "response carried no access_token"
      }`,
    );
  }
  return {
    ...creds,
    accessToken: body.access_token,
    // A minute of headroom absorbs clock skew; RingCentral's own default
    // access-token lifetime is ~2 hours (`expires_in` example: 7199).
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 7199) - 60) * 1000).toISOString(),
  };
}

const jwtBearer: AuthDefinition = {
  key: "jwt-bearer",
  type: "custom",
  displayName: "JWT Bearer (Server App)",
  description:
    "For unattended/scheduled workflows. Create a Server/Bot app at developers.ringcentral.com, " +
    'mint a "JWT credential" for the account under Auth Credentials, then paste it here along ' +
    "with the app's Client ID and Client Secret. No browser sign-in.",
  connectionLabel: "{{name}} ({{extensionNumber}})",
  fields: [
    {
      key: "jwtToken",
      label: "JWT Credential",
      type: "secret",
      required: true,
      hint: "Developer Console > your Server/Bot app > Auth Credentials > JWT credential for the " +
        "target account. This is the long-lived credential string, not a browser login.",
    },
    { key: "clientId", label: "Client ID", type: "secret", required: true, row: "client" },
    { key: "clientSecret", label: "Client Secret", type: "secret", required: true, row: "client" },
  ],

  /** Turns the three pasted values into a live access token at connect time. */
  exchange({ fields }, ctx) {
    const { jwtToken, clientId, clientSecret } = (fields ?? {}) as Record<string, string>;
    if (!jwtToken || !clientId || !clientSecret) {
      throw new Error("JWT Credential, Client ID and Client Secret are all required.");
    }
    return mintToken(ctx, { jwtToken, clientId, clientSecret });
  },

  /** Same call again — the JWT credential does not expire on the access-token cadence. */
  refresh({ credential }, ctx) {
    const { jwtToken, clientId, clientSecret } = credential as Record<string, string>;
    return mintToken(ctx, { jwtToken, clientId, clientSecret });
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    return probeCredential(ctx, accessToken);
  },

  afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    return whoAmIDisplay(ctx, accessToken);
  },
};

export default jwtBearer;
