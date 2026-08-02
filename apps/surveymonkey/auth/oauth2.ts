import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 with a SurveyMonkey application. The client_id / client_secret /
 * redirect_uri live on the w6w server, not in this package.
 *
 * SurveyMonkey's authorization-code flow takes no PKCE parameters and sends
 * `scope` as a **comma-separated** list rather than the OAuth-default space
 * (verified against the vendor's own OAuth credential wiring), hence
 * `scopeSeparator: ","`.
 *
 * Scopes are limited to what this app's actions actually use. `surveys_write`,
 * `collectors_write` and `contacts_write` gate `survey-create`, `collector-
 * create` and `contact-create` respectively; SurveyMonkey notes those two
 * "Create/Modify" scope families need vendor approval for a Public app.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with SurveyMonkey)",
  description:
    "Public OAuth flow. Requires a SurveyMonkey application registered on this w6w installation.",
  connectionLabel: "{{account.email}}",
  oauth2: {
    authorizationUrl: "https://api.surveymonkey.com/oauth/authorize",
    tokenUrl: "https://api.surveymonkey.com/oauth/token",
    scopes: [
      "users_read",
      "surveys_read",
      "surveys_write",
      "responses_read",
      "responses_read_detail",
      "collectors_read",
      "collectors_write",
      "contacts_read",
      "contacts_write",
    ],
    scopeSeparator: ",",
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `SurveyMonkey returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me`, { headers: { accept: "application/json" } });
    if (!res.ok) return {};
    const account = await res.json().catch(() => ({}));
    return { account };
  },
};

export default oauth2;
