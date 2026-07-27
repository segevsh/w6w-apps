import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Personal Access Token (`bearer`) — the recommended path for a single account.
 *
 * Calendly's API v2 authenticates every request with
 * `Authorization: Bearer <token>`. A PAT is minted from the account's
 * Integrations → API & Webhooks page (https://calendly.com/integrations/api_webhooks)
 * and is available on paid plans. For the "public integrator" path (one Calendly
 * OAuth app, many end users) see `./oauth2.ts`.
 */
const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description:
    "Recommended for a single account. Create a token at Calendly → Integrations → API & Webhooks.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  fields: [
    {
      key: "apiKey",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint: "Calendly → Integrations → API & Webhooks → Generate token.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `Calendly returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me`);
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      resource?: { uri?: string; name?: string; email?: string; current_organization?: string };
    };
    const u = body.resource ?? {};
    return {
      user: {
        uri: u.uri,
        name: u.name,
        email: u.email,
        organization: u.current_organization,
      },
    };
  },
};

export default personalAccessToken;
