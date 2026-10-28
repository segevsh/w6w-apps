import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/** The wire value Freshservice's Basic-auth parser expects: base64("<key>:X"). */
export function basicHeader(apiKey: string): string {
  return `Basic ${btoa(`${apiKey}:X`)}`;
}

/**
 * API key (`basic`).
 *
 * Freshservice authenticates with HTTP Basic where the **API key is the
 * username and any string is the password** — the docs use the literal `X`,
 * and so does every official sample (`curl -u api_key:X …`). There is no real
 * password in that slot. Verified against api.freshservice.com §Authentication
 * ("You can use your personal API key to authenticate the request. If you use
 * the API key, there is no need for a password. You can use any set of
 * characters as a dummy password.") and against n8n's `GenericFunctions.ts`,
 * which encodes `Buffer.from(`${apiKey}:X`)` — the identical scheme.
 *
 * Username/password Basic auth was **removed** on 31 May 2023; an API key is
 * the only accepted Basic credential now, and sending a password gets
 * `unsupported_authentication_type` back.
 *
 * The domain is collected here rather than per-action: it identifies the
 * account, so it belongs to the Connection. `afterConnect` echoes it onto the
 * connection's display data, which is where `lib/client.ts` reads it from.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "Find your API key under Profile Settings, below the change-password section of your Freshservice portal.",
  connectionLabel: "{{domain}}.freshservice.com",
  fields: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint:
        "Just the subdomain from `acme.freshservice.com` — not the full URL. Custom CNAMEs are " +
        "not supported by the v2 API.",
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
    // Freshservice's Basic auth: the API key as the username, a throwaway
    // password. "X" is what every official sample uses.
    request.headers["authorization"] = basicHeader(apiKey);
    return request;
  },

  /**
   * Freshservice publishes no whoami — there is no `/agents/me`, and inventing
   * one would probe an endpoint that does not exist. The docs' own
   * authentication example is `GET /api/v2/tickets`, so that is the probe,
   * narrowed to a single row so a live check costs almost nothing.
   */
  async test({ credential }, ctx) {
    const { domain, apiKey } = credential as { domain?: string; apiKey?: string };
    if (!domain || !apiKey) {
      return { ok: false, message: "credential missing domain or apiKey" };
    }
    const res = await ctx.fetch(`${baseUrl(domain)}/tickets?per_page=1`, {
      headers: { authorization: basicHeader(apiKey) },
    });
    if (!res.ok) return { ok: false, message: `Freshservice returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Records the domain on the connection so the client can build URLs
   * without ever seeing the credential.
   */
  afterConnect({ credential }) {
    const { domain } = credential as { domain?: string };
    if (!domain) return {};
    return { domain };
  },
};

export default apiKey;
