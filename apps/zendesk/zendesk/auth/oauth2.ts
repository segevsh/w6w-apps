import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * OAuth 2.0 against the account's own Zendesk host.
 *
 * Zendesk's authorize/token endpoints live under the customer's subdomain, so
 * there is no single URL this app can declare. The `{subdomain}` placeholder
 * below is filled in by the host from the connection's `subdomain` field when
 * it builds the authorize URL — which also means the OAuth host is not added
 * to the egress allowlist implicitly, and `*.zendesk.com` in `package.json` is
 * what actually permits it.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Zendesk)",
  description:
    "Public OAuth flow. Requires an OAuth client registered in the Zendesk account and on this w6w installation.",
  connectionLabel: "{{user.name}} ({{subdomain}})",
  fields: [
    {
      key: "subdomain",
      label: "Subdomain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the subdomain from `acme.zendesk.com`. It selects the OAuth host too.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
  ],
  oauth2: {
    authorizationUrl: "https://{subdomain}.zendesk.com/oauth/authorizations/new",
    tokenUrl: "https://{subdomain}.zendesk.com/oauth/tokens",
    scopes: ["read", "write"],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { subdomain, accessToken } = credential as {
      subdomain?: string;
      accessToken?: string;
    };
    if (!subdomain || !accessToken) {
      return { ok: false, message: "credential missing subdomain or accessToken" };
    }
    const res = await ctx.fetch(`${baseUrl(subdomain)}/users/me.json`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Zendesk returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { subdomain } = credential as { subdomain?: string };
    if (!subdomain) return {};
    const res = await ctx.fetch(`${baseUrl(subdomain)}/users/me.json`);
    if (!res.ok) return { subdomain };
    const body = await res.json().catch(() => ({})) as { user?: unknown };
    return { subdomain, user: body.user ?? {} };
  },
};

export default oauth2;
