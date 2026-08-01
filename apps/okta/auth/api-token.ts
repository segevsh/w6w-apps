import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * Okta's SSWS API token scheme — a static token minted in the Admin Console
 * (Security → API → Tokens), sent as `Authorization: SSWS <token>`. Okta calls
 * this out explicitly as a proprietary scheme, distinct from an OAuth 2.0
 * bearer token: https://developer.okta.com/docs/reference/core-okta-api/.
 *
 * The domain is collected here rather than per-action: it identifies the org,
 * so it belongs to the Connection. `afterConnect` echoes it onto the
 * connection's display data, which is where the client reads it from.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description:
    "Create a token under Security → API → Tokens in the Okta Admin Console, then paste it here.",
  connectionLabel: "{{domain}}",
  apiKey: { in: "header", name: "Authorization", prefix: "SSWS " },
  fields: [
    {
      key: "domain",
      label: "Okta domain",
      type: "string",
      required: true,
      placeholder: "dev-12345.okta.com",
      hint: "Your org's full Okta domain — not just the org name. Preview orgs end in " +
        "`.oktapreview.com`.",
      validation: { pattern: "^[a-zA-Z0-9-]+(\\.[a-zA-Z0-9-]+)*\\.okta(preview)?\\.com$" },
    },
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Security → API → Tokens → Create Token.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    request.headers["authorization"] = `SSWS ${apiToken}`;
    return request;
  },

  /**
   * Cheapest authenticated call that still proves the token works: list users
   * with a limit of 1. Okta's management API has no unauthenticated
   * `/users/me` — the token identifies an admin, not a session subject.
   */
  async test({ credential }, ctx) {
    const { domain, apiToken } = credential as { domain?: string; apiToken?: string };
    if (!domain || !apiToken) {
      return { ok: false, message: "credential missing domain or apiToken" };
    }
    const res = await ctx.fetch(`${baseUrl(domain)}/users?limit=1`, {
      headers: { authorization: `SSWS ${apiToken}` },
    });
    if (!res.ok) return { ok: false, message: `Okta returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Records the domain on the connection so the client can build URLs without
   * ever seeing the credential.
   */
  async afterConnect({ credential }, ctx) {
    const { domain, apiToken } = credential as { domain?: string; apiToken?: string };
    if (!domain) return {};
    const res = await ctx.fetch(`${baseUrl(domain)}/users?limit=1`, {
      headers: apiToken ? { authorization: `SSWS ${apiToken}` } : {},
    });
    if (!res.ok) return { domain };
    const body = await res.json().catch(() => []) as Array<
      { profile?: { login?: string; email?: string } }
    >;
    return { domain, user: body[0]?.profile ?? {} };
  },
};

export default apiToken;
