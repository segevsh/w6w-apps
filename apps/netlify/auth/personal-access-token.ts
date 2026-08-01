import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Netlify Personal Access Token — the only auth method the Netlify API docs
 * describe for machine-to-machine use: "Authorization: Bearer <token>",
 * minted at User settings → Applications → New access token.
 * https://docs.netlify.com/api/get-started/
 *
 * Netlify also offers an OAuth2 flow for third-party apps
 * (https://app.netlify.com/authorize is the documented authorize endpoint),
 * but its token-exchange endpoint is not published in Netlify's own docs or
 * OpenAPI spec — only a 2016 blog post gestures at "the typical OAuth2 flow"
 * without naming it. Rather than guess a token URL, this app ships PAT-only;
 * see README.md "Auth methods".
 */
const auth: AuthDefinition = {
  key: "personal-access-token",
  type: "apiKey",
  displayName: "Netlify Personal Access Token",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "accessToken",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint: "Create one at User settings → Applications → New access token (app.netlify.com).",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /user` — Netlify's whoami. Cheapest possible read: a personal access
   * token carries no scopes to legitimately lack, and this needs no site or
   * account context, unlike `GET /sites` (which n8n's credential test uses
   * but which returns a page of data just to prove liveness).
   * https://open-api.netlify.com/ (operationId `getCurrentUser`)
   */
  async test({ credential: _credential }, ctx) {
    const res = await ctx.fetch(`${API_BASE}/user`, {
      headers: { "content-type": "application/json" },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => undefined) as { message?: string } | undefined;
      return {
        ok: false,
        message: body?.message ?? `Token verification failed: HTTP ${res.status}`,
      };
    }
    return { ok: true };
  },
};

export default auth;
