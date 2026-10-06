import type { AuthDefinition } from "@w6w/types";
import { API_URL, API_VERSION } from "../lib/client.ts";

/**
 * OAuth 2.0 authorization-code flow with Facebook Login for Business.
 *
 * Custom audiences live on an ad account, so the grant needs the Marketing API
 * permissions:
 *
 *   - `ads_management` — create, update and delete audiences, upload and remove
 *     members, create lookalikes;
 *   - `ads_read` — list ad accounts and read audiences back.
 *
 * Both need Advanced Access (App Review) on the Facebook App before anyone
 * outside the app's own roles can authorise it. The Custom Audience Terms of
 * Service must also have been accepted on the ad account (`tos_accepted` on the
 * ad account; Meta's error 1870090 otherwise).
 *
 * An OAuth grant names no ad account, so every action takes an `adAccountId`
 * parameter; `list-ad-accounts` is how a workflow finds one.
 *
 * Register the Facebook App in the Meta for Developers console and store its
 * `client_id` / `client_secret` / `redirect_uri` on the w6w server via
 * `PUT /apps/:id/oauth-config/oauth2`.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "Facebook (Ads)",
  description:
    "Sign in with Facebook and grant ads_management and ads_read on the ad accounts you manage. Needs a Facebook App with Advanced Access to those permissions.",
  connectionLabel: "{{user.name}} ({{user.id}})",
  oauth2: {
    authorizationUrl: `https://www.facebook.com/${API_VERSION}/dialog/oauth`,
    tokenUrl: `${API_URL}/oauth/access_token`,
    scopes: ["ads_management", "ads_read"],
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    // `/me?fields=id` needs no ads permission and returns only the caller's own
    // public id, never the token.
    const res = await ctx.fetch(`${API_URL}/me?fields=id`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    // Judge by the body, not the status: a live token answers `{ id }`; Meta's
    // own error envelope carries `error.code` (190 = invalid or expired token).
    const body = await res.json().catch(() => undefined) as
      | { id?: string; error?: { code?: number; message?: string } }
      | undefined;
    if (typeof body?.id === "string") return { ok: true };
    if (body?.error?.code === 190) {
      return { ok: false, message: "Meta rejected the access token (invalid or expired)" };
    }
    return {
      ok: false,
      message: `Meta returned ${res.status}${
        body?.error?.code ? ` (code ${body.error.code})` : ""
      }`,
    };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me?fields=id,name`);
    if (!res.ok) return {};
    const user = await res.json() as { id?: string; name?: string };
    return { user: { id: user.id, name: user.name } };
  },
};

export default oauth2;
