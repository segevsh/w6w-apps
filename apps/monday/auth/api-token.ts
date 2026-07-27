import type { AuthDefinition } from "@w6w/types";
import { API_URL, API_VERSION } from "../lib/client.ts";

/**
 * Personal API token (`custom`).
 *
 * monday expects the token in the Authorization header **without** a scheme —
 * `Authorization: eyJ…`, not `Bearer eyJ…`. That is why this is `custom` rather
 * than `bearer`: the type describes what actually goes on the wire.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "custom",
  displayName: "API Token",
  description:
    "Paste a personal API token from monday.com → Developers → My Access Tokens (or a profile avatar → Administration → Connections → API).",
  connectionLabel: "{{user.name}}",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "monday.com → click your avatar → Developers → My Access Tokens → Show.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    // No `Bearer` prefix — monday takes the raw token.
    request.headers["authorization"] = apiToken;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiToken } = credential as { apiToken?: string };
    if (!apiToken) return { ok: false, message: "credential missing apiToken" };
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: {
        authorization: apiToken,
        "content-type": "application/json",
        "api-version": API_VERSION,
      },
      body: JSON.stringify({ query: "{ me { id name } }" }),
    });
    const body = await res.json().catch(() => ({})) as {
      errors?: Array<{ message?: string }>;
    };
    if (!res.ok || body.errors?.length) {
      return {
        ok: false,
        message: body.errors?.[0]?.message ?? `monday returned ${res.status}`,
      };
    }
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "api-version": API_VERSION },
      body: JSON.stringify({
        query: "{ me { id name email } }",
      }),
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      data?: { me?: { id?: string; name?: string; email?: string } };
    };
    if (!body.data?.me) return {};
    return { user: body.data.me };
  },
};

export default apiToken;
