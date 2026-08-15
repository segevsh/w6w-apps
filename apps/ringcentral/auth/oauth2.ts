import type { AuthDefinition } from "@w6w/types";
import { OAUTH_AUTHORIZE_URL, OAUTH_REVOKE_URL, OAUTH_TOKEN_URL } from "../lib/client.ts";
import { probeCredential, whoAmIDisplay } from "./_shared.ts";

/**
 * OAuth 2.0 Authorization Code + PKCE (`oauth2`) — "sign in with RingCentral".
 *
 * Confirmed against `components.securitySchemes.OAuth2` and the
 * `/restapi/oauth/authorize` and `/restapi/oauth/token` operations in
 * RingCentral's OpenAPI document. PKCE is documented (`code_challenge` /
 * `code_challenge_method` on the authorize endpoint) and is the recommended
 * flow for any client that can complete a browser round-trip, which every
 * interactive Connection can.
 *
 * This is the flow for a human connecting their own RingCentral seat. It needs
 * a browser round-trip and does not work in a background/scheduled run without
 * a live user session — see `auth/jwt-bearer.ts` for the server-app
 * alternative the task brief asked for.
 *
 * ## Scopes are the vendor's `x-app-permission` names
 *
 * RingCentral's OAuth `scope` request parameter is the space-separated list of
 * "application permissions" — literally the `x-app-permission` value stamped
 * on each operation in the OpenAPI document (`ReadAccounts`, `SMS`,
 * `ReadMessages`, `ReadCallLog`, `ReadPresence`, `RingOut`). Listed here is
 * exactly the set this app's actions need, read directly off the operations
 * this app calls — nothing broader. The app itself must also be granted these
 * permissions in RingCentral's Developer Console; the OAuth scope only narrows
 * what a given Connection is allowed to request from an app that already has
 * them.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with RingCentral)",
  description:
    "Public OAuth 2.0 + PKCE flow. Requires a RingCentral app (Client ID / Client Secret / " +
    "redirect URI) registered at developers.ringcentral.com and configured on this w6w " +
    "installation. Works for interactive connections; scheduled/background runs need the " +
    "JWT Bearer method instead.",
  connectionLabel: "{{name}} ({{extensionNumber}})",
  oauth2: {
    authorizationUrl: OAUTH_AUTHORIZE_URL,
    tokenUrl: OAUTH_TOKEN_URL,
    refreshUrl: OAUTH_TOKEN_URL,
    revokeUrl: OAUTH_REVOKE_URL,
    scopes: ["ReadAccounts", "SMS", "ReadMessages", "ReadCallLog", "ReadPresence", "RingOut"],
    pkce: true,
  },

  /**
   * Not the auto-signed request the runtime routes through `sign` for Actions —
   * `test` runs during the auth lifecycle and stamps the header itself, exactly
   * like every other `oauth2` app in this pack (see `discord/auth/oauth2.ts`).
   */
  test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    return probeCredential(ctx, accessToken);
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    return whoAmIDisplay(ctx, accessToken);
  },
};

export default oauth2;
