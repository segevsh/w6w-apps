import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API Token (`basic`).
 *
 * Toggl's own Swagger spec spells out the exact scheme (`info.description` of
 * https://engineering.toggl.com's published `api-*.json`): "We use BasicAuth
 * in a specific way. By the standard you provide `Authentication` header with
 * `base64(user_name:password)` as a credential. In our case it will be
 * `base64(user_name:api_token)`." — the API token goes in the *username* slot,
 * and the literal string `api_token` is the password; there is no real
 * password. Cross-checked against Toggl's own authentication docs
 * (engineering.toggl.com/docs/authentication) and against n8n's
 * `TogglApi.credentials.ts` test request (`GET /me`, HTTP Basic).
 *
 * Generate a token from the user's Toggl Track profile settings
 * (track.toggl.com/profile) — this app does not collect email/password, only
 * the token, since Toggl's account password auth is legacy and the token is
 * the vendor-recommended path.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "basic",
  displayName: "API Token",
  description: "Paste your API token from track.toggl.com/profile.",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "track.toggl.com/profile → API Token, near the bottom of the page.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    request.headers["authorization"] = `Basic ${btoa(`${apiToken}:api_token`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiToken } = credential as { apiToken?: string };
    if (!apiToken) {
      return { ok: false, message: "credential missing apiToken" };
    }
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Basic ${btoa(`${apiToken}:api_token`)}` },
    });
    if (!res.ok) return { ok: false, message: `Toggl returned ${res.status}` };
    return { ok: true };
  },
};

export default apiToken;
