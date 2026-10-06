import type { AuthDefinition } from "@w6w/types";
import { bearer } from "./headers.ts";
import { probe, whoLabel } from "./probe.ts";

/**
 * OAuth 2.0 with a Twist integration. The client id and secret live on the w6w server; the
 * `twist.com` authorize and token hosts are handled host-side and are not in `network.allow`.
 *
 * Verified against the "Authorization" section of the v3 reference (2026-10-06):
 *   - authorize: `https://twist.com/oauth/authorize` with `client_id`, `scope`, `state`
 *   - token:     `POST https://twist.com/oauth/access_token` with `client_id`,
 *                `client_secret`, `code`
 *   - `scope` is a COMMA-separated list
 * The reference documents no refresh token, no expiry and no PKCE, so none is declared.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Twist)",
  description:
    "Public OAuth flow. Requires a Twist integration registered on this w6w installation.",
  connectionLabel: "Twist ({{name}})",
  oauth2: {
    authorizationUrl: "https://twist.com/oauth/authorize",
    tokenUrl: "https://twist.com/oauth/access_token",
    scopes: [
      "user:read",
      "user:write",
      "workspaces:read",
      "workspaces:write",
      "channels:read",
      "channels:write",
      "channels:remove",
      "threads:read",
      "threads:write",
      "threads:remove",
      "comments:read",
      "comments:write",
      "comments:remove",
      "groups:read",
      "groups:write",
      "groups:remove",
      "messages:read",
      "messages:write",
      "messages:remove",
      "reactions:read",
      "reactions:write",
      "reactions:remove",
      "search:read",
      "attachments:read",
      "attachments:write",
      "notifications:read",
      "notifications:write",
    ],
    scopeSeparator: ",",
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    for (const [name, value] of Object.entries(bearer(accessToken))) request.headers[name] = value;
    return request;
  },

  test({ credential }, ctx) {
    return probe((credential as { accessToken?: string })?.accessToken, ctx);
  },

  afterConnect({ credential }, ctx) {
    return whoLabel((credential as { accessToken?: string })?.accessToken, ctx);
  },
};

export default oauth2;
