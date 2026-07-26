import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API Key + Token (`custom`).
 *
 * Trello does not use an Authorization header: every request carries
 * `?key=<apiKey>&token=<apiToken>` in the query string. `sign` may rewrite any
 * part of the request — URL included — so it appends both there, and Actions
 * stay credential-free.
 *
 * n8n's credential also collects an `oauthSecret` used to verify webhook
 * payload signatures. There is no trigger surface in this port, so it is
 * omitted rather than collected and ignored.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key & Token",
  description:
    "Get the key at trello.com/power-ups/admin, then generate a token from the same page.",
  connectionLabel: "{{user.fullName}} (@{{user.username}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      row: "creds",
      hint: "trello.com/power-ups/admin → your Power-Up → API Key.",
    },
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      row: "creds",
      hint: "Generated from the 'Token' link next to the API key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey, apiToken } = credential as { apiKey: string; apiToken: string };
    const url = new URL(request.url);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("token", apiToken);
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey, apiToken } = credential as { apiKey?: string; apiToken?: string };
    if (!apiKey || !apiToken) {
      return { ok: false, message: "credential missing apiKey or apiToken" };
    }
    const url = `${API_URL}/members/me?key=${encodeURIComponent(apiKey)}&token=${
      encodeURIComponent(apiToken)
    }`;
    const res = await ctx.fetch(url);
    if (!res.ok) return { ok: false, message: `Trello returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/members/me`);
    if (!res.ok) return {};
    const me = await res.json().catch(() => ({})) as {
      id?: string;
      username?: string;
      fullName?: string;
    };
    return { user: { id: me.id, username: me.username, fullName: me.fullName } };
  },
};

export default apiKey;
