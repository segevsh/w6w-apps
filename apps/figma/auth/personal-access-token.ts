import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Personal access token (`apiKey`). Generate one under Figma ->
 * Settings -> Security -> Personal access tokens, choosing the scopes this
 * Connection needs, and paste it here. Every request signs with the
 * `X-Figma-Token` header — Figma's REST API does not use a `Bearer` scheme
 * for this credential type. See
 * https://developers.figma.com/docs/rest-api/personal-access-tokens/.
 *
 * Scopes are selected per-token at creation time, so a narrowly-scoped token
 * may legitimately lack `current_user:read` — `test` reports that as a
 * failure rather than assuming every token can call `/v1/me`.
 */
const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "apiKey",
  displayName: "Personal Access Token",
  description:
    "Paste a personal access token from Figma -> Settings -> Security -> Personal access tokens.",
  connectionLabel: "{{user.handle}} ({{user.email}})",
  apiKey: { in: "header", name: "X-Figma-Token" },
  fields: [
    {
      key: "token",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint: "Figma -> Settings -> Security -> Personal access tokens -> Generate new token.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["x-figma-token"] = token;
    return request;
  },

  async test({ credential }, ctx) {
    const { token } = credential as { token?: string };
    if (!token) return { ok: false, message: "credential missing token" };
    const res = await ctx.fetch(`${API_URL}/v1/me`, {
      headers: { "x-figma-token": token, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Figma returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/v1/me`, { headers: { accept: "application/json" } });
    if (!res.ok) return {};
    const user = await res.json().catch(() => ({})) as {
      id?: string;
      handle?: string;
      email?: string;
      img_url?: string;
    };
    return { user };
  },
};

export default personalAccessToken;
