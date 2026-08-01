import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * API key (`basic`).
 *
 * Freshdesk's API-key scheme is HTTP Basic with the key as the username and
 * the literal string `X` as the password — there is no real password, `X` is
 * just what Freshdesk's Basic-auth parser expects in that slot. Verified
 * against developers.freshdesk.com/api/ (`curl -u apikey:X`) and against
 * n8n's `FreshdeskApi.credentials.ts`, which encodes the identical scheme.
 *
 * The domain is collected here rather than per-action: it identifies the
 * account, so it belongs to the Connection. `afterConnect` echoes it onto the
 * connection's display data, which is where the client reads it from.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description: "Find your API key under Profile Settings, on the right of your Freshdesk portal.",
  connectionLabel: "{{agent.contact.name}} ({{domain}})",
  fields: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the subdomain from `acme.freshdesk.com` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Profile Settings → API Key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // Freshdesk's Basic auth: the API key as the username, the literal "X" as
    // the password.
    request.headers["authorization"] = `Basic ${btoa(`${apiKey}:X`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { domain, apiKey } = credential as { domain?: string; apiKey?: string };
    if (!domain || !apiKey) {
      return { ok: false, message: "credential missing domain or apiKey" };
    }
    const res = await ctx.fetch(`${baseUrl(domain)}/agents/me`, {
      headers: { authorization: `Basic ${btoa(`${apiKey}:X`)}` },
    });
    if (!res.ok) return { ok: false, message: `Freshdesk returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Records the domain on the connection so the client can build URLs
   * without ever seeing the credential.
   */
  async afterConnect({ credential }, ctx) {
    const { domain, apiKey } = credential as { domain?: string; apiKey?: string };
    if (!domain) return {};
    const res = await ctx.fetch(`${baseUrl(domain)}/agents/me`, {
      headers: { authorization: `Basic ${btoa(`${apiKey}:X`)}` },
    });
    if (!res.ok) return { domain };
    const agent = await res.json().catch(() => ({})) as Record<string, unknown>;
    return { domain, agent };
  },
};

export default apiKey;
