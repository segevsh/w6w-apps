import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API Key (`bearer`) — Cal.com's single, non-OAuth auth path.
 *
 * Cal.com API v2 authenticates every request with `Authorization: Bearer
 * <api-key>`. Keys are minted from the account's Settings → Developer → API
 * Keys page and are prefixed `cal_` (test) or `cal_live_` (live). Cal.com's own
 * docs recommend OAuth ("Platform OAuth") for building a public integration
 * that serves many end users, but Platform OAuth stopped accepting new
 * signups on 2025-12-15 — so a per-account API key is the only path currently
 * open to a first-party integration, and is what a single-account connection
 * would use regardless.
 *
 * Verified live against `https://api.cal.com/v2/me` 2026-08-01: an invalid
 * `Authorization: Bearer` token returns `401
 * {"error":{"code":"UnauthorizedException","message":"ApiAuthStrategy - api
 * key - Your api key is not valid",...}}`, confirming the header name/format
 * below. The same probe with no Authorization header at all returns a
 * different 401 message ("No authentication method provided"), so `/v2/me`
 * genuinely checks the header rather than 404ing past it.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Create a key at Cal.com → Settings → Developer → API Keys.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Cal.com → Settings → Developer → API Keys → Add. Starts with cal_ or cal_live_.",
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
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `Cal.com returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me`);
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      data?: { id?: number; username?: string; name?: string; email?: string };
    };
    const u = body.data ?? {};
    return {
      user: {
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
      },
    };
  },
};

export default apiKey;
