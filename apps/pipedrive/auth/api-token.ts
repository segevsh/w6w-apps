import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Pipedrive personal API token (`apiKey`).
 *
 * Pipedrive does NOT take the token in an Authorization header — it travels as a
 * `?api_token=<token>` query param on every request. The runtime appends it
 * automatically via the `apiKey` config below (`in: "query"`); `sign` mirrors
 * that same wiring for callers that invoke `sign()` directly (tests, custom
 * hosts).
 *
 * Find the token under Settings → Personal preferences → API in a Pipedrive
 * account with API access enabled.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description:
    "Paste a personal API token from Settings → Personal preferences → API. Travels as the `api_token` query param.",
  connectionLabel: "{{user.name}} ({{company.name}})",
  apiKey: { in: "query", name: "api_token" },
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Settings → Personal preferences → API. Requires API access on the account.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    const url = new URL(request.url);
    url.searchParams.set("api_token", apiToken);
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiToken } = credential as { apiToken?: string };
    if (!apiToken) return { ok: false, message: "credential missing apiToken" };
    const url = new URL(`${API_URL}/users/me`);
    url.searchParams.set("api_token", apiToken);
    const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!res.ok) return { ok: false, message: `Pipedrive returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { apiToken } = credential as { apiToken?: string };
    if (!apiToken) return {};
    const url = new URL(`${API_URL}/users/me`);
    url.searchParams.set("api_token", apiToken);
    const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      data?: { name?: string; email?: string; company_name?: string };
    };
    const me = body.data ?? {};
    return {
      user: { name: me.name ?? me.email ?? "Pipedrive user", email: me.email },
      company: { name: me.company_name ?? "Pipedrive" },
    };
  },
};

export default apiToken;
