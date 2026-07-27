import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Personal API token (`custom`).
 *
 * ClickUp does NOT use the `Bearer` scheme: a personal token is sent as a raw
 * `Authorization: <token>` header (the token itself, verbatim, no prefix). That
 * is non-standard enough that this is a `custom` method with its own `sign`
 * rather than a `bearer` method — a `bearer` credential would emit
 * `Authorization: Bearer <token>`, which ClickUp rejects with 401.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "custom",
  displayName: "API Token",
  description:
    "Paste a personal token from ClickUp → Settings → Apps → API Token (starts with `pk_`).",
  connectionLabel: "{{user.username}} ({{user.email}})",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "ClickUp → Settings → Apps → Generate / copy your personal API token.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    request.headers["authorization"] = apiToken;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiToken } = credential as { apiToken?: string };
    if (!apiToken) return { ok: false, message: "credential missing apiToken" };
    const res = await ctx.fetch(`${API_URL}/user`, {
      headers: { authorization: apiToken },
    });
    if (!res.ok) return { ok: false, message: `ClickUp returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/user`);
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      user?: { id?: number; username?: string; email?: string };
    };
    const u = body.user ?? {};
    return { user: { id: u.id, username: u.username, email: u.email } };
  },
};

export default apiToken;
