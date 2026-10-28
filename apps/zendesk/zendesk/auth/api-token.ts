import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * Email + API token (`basic`).
 *
 * Zendesk's API-token scheme is HTTP Basic with a specially-shaped username:
 * `{email}/token` as the user and the API token as the password. That `/token`
 * suffix is what distinguishes it from a password login — get it wrong and
 * Zendesk answers 401 with "couldn't authenticate you".
 *
 * The subdomain is collected here rather than per-action: it identifies the
 * account, so it belongs to the Connection. `afterConnect` echoes it onto the
 * connection's display data, which is where the client reads it from.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "basic",
  displayName: "Email & API Token",
  description:
    "Enable token access under Admin Center → Apps and integrations → Zendesk API, then add a token.",
  connectionLabel: "{{user.name}} ({{subdomain}})",
  fields: [
    {
      key: "subdomain",
      label: "Subdomain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the subdomain from `acme.zendesk.com` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      row: "creds",
      hint: "The agent account the token belongs to.",
    },
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      row: "creds",
      hint: "Admin Center → Apps and integrations → Zendesk API → API tokens.",
    },
  ],

  sign({ request, credential }) {
    const { email, apiToken } = credential as { email: string; apiToken: string };
    // The `/token` suffix on the username is what selects token auth.
    request.headers["authorization"] = `Basic ${btoa(`${email}/token:${apiToken}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { subdomain, email, apiToken } = credential as {
      subdomain?: string;
      email?: string;
      apiToken?: string;
    };
    if (!subdomain || !email || !apiToken) {
      return { ok: false, message: "credential missing subdomain, email or apiToken" };
    }
    const res = await ctx.fetch(`${baseUrl(subdomain)}/users/me.json`, {
      headers: { authorization: `Basic ${btoa(`${email}/token:${apiToken}`)}` },
    });
    if (!res.ok) return { ok: false, message: `Zendesk returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Records the subdomain on the connection so the client can build URLs
   * without ever seeing the credential.
   */
  async afterConnect({ credential }, ctx) {
    const { subdomain } = credential as { subdomain?: string };
    if (!subdomain) return {};
    const res = await ctx.fetch(`${baseUrl(subdomain)}/users/me.json`);
    if (!res.ok) return { subdomain };
    const body = await res.json().catch(() => ({})) as {
      user?: { id?: number; name?: string; email?: string };
    };
    return { subdomain, user: body.user ?? {} };
  },
};

export default apiToken;
