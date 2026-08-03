import type { AuthDefinition } from "@w6w/types";
import { DEFAULT_SITE_URL, resolveBaseUrl } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — scoped, per-app access to **getgrist.com-hosted** sites.
 *
 * Grist runs a real OIDC server. Every endpoint and scope below was read off the
 * live discovery document on 2026-08-03:
 *
 *   GET https://login.getgrist.com/.well-known/oauth-authorization-server
 *   → authorization_endpoint      https://login.getgrist.com/oidc/auth
 *     token_endpoint              https://login.getgrist.com/oidc/token
 *     revocation_endpoint         https://login.getgrist.com/oidc/token/revocation
 *     code_challenge_methods_supported ["S256"]
 *     grant_types_supported       ["implicit","authorization_code","refresh_token"]
 *     scopes_supported            ["offline_access","doc:read","doc:write",
 *                                  "doc.schema:write","doc:download",
 *                                  "doc:webhooks","user.profile:read"]
 *
 * Access tokens are opaque, prefixed `grist_at_`, and go in the same
 * `Authorization: Bearer` header as an API key — the difference is that a token
 * is limited to the scopes and documents the user granted, where a key carries
 * that user's full access.
 *
 * ### Why this method is hosted-only
 *
 * A self-hosted Grist runs **its own** OAuth server (its endpoints come from
 * `https://<your-server>/.well-known/oauth-authorization-server`, and OAuth apps
 * are part of the paid full edition rather than `grist-oss`). `OAuth2Config`
 * takes one static `authorizationUrl`/`tokenUrl` pair for the whole App, so a
 * single declaration cannot follow a per-Connection issuer. Pointing a
 * self-hosted user at `login.getgrist.com` would silently authenticate them
 * against the wrong server. Self-hosted installs use `./api-key.ts`.
 *
 * Requires a Grist OAuth app registered on the target site (Account settings →
 * Developer → Register app), whose client_id / client_secret / redirect_uri live
 * in an `app_oauth_config` row on this w6w installation, not in this package.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (getgrist.com)",
  description:
    "Scoped OAuth access to a getgrist.com-hosted site. Requires a registered Grist OAuth app on " +
    "this w6w installation. Self-hosted Grist runs its own OAuth server — use the API Key method there.",
  connectionLabel: "{{user.name}} @ {{site.host}}",
  oauth2: {
    authorizationUrl: "https://login.getgrist.com/oidc/auth",
    tokenUrl: "https://login.getgrist.com/oidc/token",
    revokeUrl: "https://login.getgrist.com/oidc/token/revocation",
    /**
     * `offline_access` is what makes Grist issue a refresh token — without it a
     * Connection dies when the access token expires, which is fatal for
     * unattended runs. `user.profile:read` is required by `test`/`afterConnect`
     * below: the doc scopes grant nothing on `/profile/user`.
     */
    scopes: [
      "offline_access",
      "user.profile:read",
      "doc:read",
      "doc:write",
      "doc.schema:write",
      "doc:download",
    ],
    scopeSeparator: " ",
    // The discovery document advertises S256 and nothing else.
    pkce: true,
  },
  fields: [
    {
      key: "siteUrl",
      label: "Grist Site URL",
      type: "string",
      required: true,
      default: DEFAULT_SITE_URL,
      placeholder: "https://<team>.getgrist.com",
      hint:
        "Which getgrist.com site the API calls go to. The login server is always login.getgrist.com; " +
        "this is the data plane (https://docs.getgrist.com for your personal site).",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /** Same `anonymous` guard as `api-key.ts` — see the note there for why. */
  async test({ credential }, ctx) {
    const { siteUrl, accessToken } = credential as { siteUrl?: string; accessToken?: string };
    if (!siteUrl) return { ok: false, message: "credential missing siteUrl" };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    let baseUrl: string;
    try {
      baseUrl = resolveBaseUrl({ siteUrl });
    } catch {
      return { ok: false, message: "siteUrl is not a usable base URL" };
    }

    const res = await ctx.fetch(`${baseUrl}/profile/user`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Grist returned ${res.status}` };

    const user = await res.json().catch(() => ({})) as { anonymous?: boolean };
    if (user.anonymous === true) {
      return {
        ok: false,
        message: "Grist answered as the anonymous user — the token did not apply",
      };
    }
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { siteUrl } = credential as { siteUrl?: string };
    const res = await ctx.fetch("/profile/user");
    let user: { id?: number; name?: string; email?: string } = {};
    if (res.ok) user = await res.json().catch(() => ({})) as typeof user;

    let host = "";
    try {
      host = siteUrl ? new URL(siteUrl).host : "";
    } catch { /* leave blank */ }

    return {
      siteUrl,
      site: { host },
      user: { id: user.id, name: user.name, email: user.email },
    };
  },
};

export default oauth2;
