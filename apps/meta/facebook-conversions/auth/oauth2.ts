import type { AuthDefinition } from "@w6w/types";
import { API_URL, API_VERSION } from "../lib/client.ts";

/**
 * OAuth 2.0 with Facebook for Business — the *platform partner* path, not the
 * advertiser path.
 *
 * A direct integration should use `conversions-token`: Meta hands out a
 * dataset-scoped token from Events Manager with no app review and no
 * permissions. This method exists for the other documented case — a platform
 * sending events on behalf of many advertisers, where Meta requires:
 *
 *   "`ads_management` OR (`business_management` AND `pages_read_engagement`
 *    AND `ads_read`)" at advanced ("Full") access, plus the Marketing API
 *    Access Tier feature.
 *   — developers.facebook.com/docs/marketing-api/conversions-api/guides/
 *     end-to-end-implementation (checked 2026-08-03)
 *
 * Only the first arm is requested here; the second exists to cover partners who
 * already hold Pages permissions for other reasons and is not a smaller ask.
 * `ads_read` is added because the two read actions in this app (`get-dataset`,
 * `get-dataset-quality`) need it — sending events does not.
 *
 * An OAuth grant names no dataset, so connections made this way have nothing to
 * stamp into `display.dataset`: every action must pass `datasetId` explicitly.
 * `lib/client.ts#datasetFromConnection` says exactly that when it is missing.
 *
 * Register the Facebook App in the Meta for Developers console and store its
 * `client_id` / `client_secret` / `redirect_uri` on the w6w server via
 * `PUT /apps/:id/oauth-config/oauth2`.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Business — platform partners)",
  description:
    "Public OAuth flow for platforms sending events on behalf of advertisers. Needs a Facebook App with advanced ads_management access. Direct advertisers should use the Conversions API Token method instead.",
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
    const res = await ctx.fetch(`${API_URL}/me?fields=id`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Meta returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me?fields=id,name`);
    if (!res.ok) return {};
    const user = await res.json() as { id?: string; name?: string };
    return { user: { id: user.id, name: user.name } };
  },
};

export default oauth2;
