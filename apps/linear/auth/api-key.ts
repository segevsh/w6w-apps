import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Personal API Key (`custom`).
 *
 * Linear expects the key in the Authorization header **without** a scheme —
 * `Authorization: lin_api_…`, not `Bearer lin_api_…`. That is why this is
 * `custom` rather than `bearer`: the type describes what actually goes on the
 * wire.
 *
 * n8n's credential also collects a webhook `signingSecret`. There is no trigger
 * surface in this port, so it is omitted rather than stored unused.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key",
  description: "Paste a personal API key from Linear → Settings → Security & access → API keys.",
  connectionLabel: "{{user.name}} ({{organization.name}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Settings → Security & access → Personal API keys. Starts with `lin_api_`.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // No `Bearer` prefix — Linear takes the raw key.
    request.headers["authorization"] = apiKey;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { authorization: apiKey, "content-type": "application/json" },
      body: JSON.stringify({ query: "{ viewer { id } }" }),
    });
    const body = await res.json().catch(() => ({})) as {
      errors?: Array<{ message?: string }>;
    };
    if (!res.ok || body.errors?.length) {
      return {
        ok: false,
        message: body.errors?.[0]?.message ?? `Linear returned ${res.status}`,
      };
    }
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "{ viewer { id name email } organization { id name urlKey } }",
      }),
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      data?: {
        viewer?: { id?: string; name?: string; email?: string };
        organization?: { id?: string; name?: string; urlKey?: string };
      };
    };
    if (!body.data) return {};
    return { user: body.data.viewer ?? {}, organization: body.data.organization ?? {} };
  },
};

export default apiKey;
