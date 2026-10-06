import type { AuthDefinition } from "@w6w/types";
import { baseUrl, errorDetail } from "../lib/client.ts";

/** TalentLMS's Basic scheme: the API key is the username and the password is empty. */
export function basicHeader(apiKey: string): string {
  return `Basic ${btoa(`${apiKey}:`)}`;
}

/**
 * API key (`basic`).
 *
 * The reference says only "providing the API key in the request" and shows the
 * PHP library, which sends it as the HTTP Basic username with an empty
 * password. An unauthenticated call to any subdomain answers
 * `401 You need a valid user and password`, confirming Basic.
 *
 * The subdomain identifies the account, so it is collected here and echoed onto
 * the connection's display data by `afterConnect`, where `lib/client.ts` reads it.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "A super administrator enables the API and finds the key under Account & Settings → Basic settings.",
  connectionLabel: "{{domain}}.talentlms.com",
  fields: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the subdomain from `acme.talentlms.com` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Account & Settings → Basic settings (super administrators only).",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = basicHeader(apiKey);
    return request;
  },

  /**
   * `GET /ratelimit` — the reference states it "does not count against your rate
   * limit", and its body is `{limit, remaining, reset, formatted_reset}`, so it
   * never echoes the credential. The verdict comes from the body (a `limit`
   * field), with the vendor's own error message on a refusal.
   */
  async test({ credential }, ctx) {
    const { domain, apiKey } = credential as { domain?: string; apiKey?: string };
    if (!domain || !apiKey) {
      return { ok: false, message: "credential missing domain or apiKey" };
    }
    const res = await ctx.fetch(`${baseUrl(domain)}/ratelimit`, {
      headers: { authorization: basicHeader(apiKey), accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return { ok: false, message: `TalentLMS returned ${res.status}: ${errorDetail(text)}` };
    }
    let body: { limit?: unknown } | null = null;
    try {
      body = JSON.parse(text);
    } catch {
      // fall through to the shape check
    }
    if (body?.limit === undefined) {
      return { ok: false, message: "TalentLMS answered, but not with the rate-limit document" };
    }
    return { ok: true };
  },

  /** Records the domain on the connection so the client can build URLs without the credential. */
  afterConnect({ credential }) {
    const { domain } = credential as { domain?: string };
    if (!domain) return {};
    return { domain };
  },
};

export default apiKey;
