import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * CircleCI Personal API Token — the only auth method the CircleCI API v2
 * docs describe for machine-to-machine use: every request carries a
 * `Circle-Token: <token>` header (no `Bearer` prefix). Minted at
 * User settings → Personal API Tokens (app.circleci.com/settings/user/tokens).
 * https://circleci.com/docs/api/v2/ ("Authentication" section)
 *
 * CircleCI also supports project-scoped API tokens and, for CircleCI-hosted
 * GitHub/Bitbucket orgs, an OAuth app flow for third-party integrations —
 * but neither is documented with a stable token/authorize URL suitable for a
 * generic Connection, so this app ships personal-token-only, the same choice
 * this pack already made for Netlify. See README.md "Auth methods".
 */
const auth: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "CircleCI Personal API Token",
  apiKey: { in: "header", name: "Circle-Token" },
  fields: [
    {
      key: "token",
      label: "Personal API Token",
      type: "secret",
      required: true,
      hint: "Create one at User settings → Personal API Tokens (app.circleci.com).",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["circle-token"] = token;
    return request;
  },

  /**
   * `GET /me` — CircleCI's whoami. Cheapest possible read: a personal API
   * token is not scoped, so this needs no project or org context, unlike a
   * project-scoped probe that could fail for a token that legitimately
   * cannot see that project.
   * https://circleci.com/docs/api/v2/#tag/User/operation/getCurrentUser
   */
  async test({ credential: _credential }, ctx) {
    const res = await ctx.fetch(`${API_BASE}/me`, {
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
