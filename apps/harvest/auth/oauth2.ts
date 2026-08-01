import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 against Harvest's identity host, `id.getharvest.com` — a
 * separate host from the `api.harvestapp.com` API itself. The client_id /
 * client_secret / redirect_uri live on the w6w server, not in this package.
 *
 * A Harvest OAuth token can grant access to *several* accounts at once (the
 * authorizing user's own Harvest and Forecast accounts), so which account to
 * operate on is a separate choice the v2 API forces via `Harvest-Account-Id`
 * on every request — unlike, say, Zendesk's subdomain, this isn't baked into
 * the authorize/token URLs. `afterConnect` cannot resolve it *for* `sign`:
 * per the hook contract it only supplies display data, it cannot write back
 * into the stored credential. So `accountId` is collected as an explicit
 * field, same as the personal-access-token method; `afterConnect` calls
 * Harvest's account-discovery endpoint purely to enrich the connection label
 * and confirm the id the user typed actually resolves to a Harvest account.
 */
const ACCOUNTS_URL = "https://id.getharvest.com/api/v2/accounts";

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Harvest)",
  description:
    "Public OAuth flow. Requires a Harvest OAuth2 app registered on this w6w installation.",
  connectionLabel: "{{user.first_name}} {{user.last_name}} ({{account.name}})",
  fields: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint: "The Harvest account to operate on — every request needs it alongside the token. " +
        "Find it at id.getharvest.com/api/v2/accounts if you belong to more than one.",
    },
  ],
  oauth2: {
    authorizationUrl: "https://id.getharvest.com/oauth2/authorize",
    tokenUrl: "https://id.getharvest.com/api/v2/oauth2/token",
    scopes: [],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accountId, accessToken } = credential as { accountId: string; accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    request.headers["harvest-account-id"] = accountId;
    return request;
  },

  async test({ credential }, ctx) {
    const { accountId, accessToken } = credential as {
      accountId?: string;
      accessToken?: string;
    };
    if (!accountId || !accessToken) {
      return { ok: false, message: "credential missing accountId or accessToken" };
    }
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        "harvest-account-id": accountId,
      },
    });
    if (!res.ok) return { ok: false, message: `Harvest returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { accountId, accessToken } = credential as {
      accountId?: string;
      accessToken?: string;
    };
    if (!accessToken) return {};
    // Needs only the bearer token — no Harvest-Account-Id — since its whole
    // purpose is discovering which accounts that token can see.
    const res = await ctx.fetch(ACCOUNTS_URL, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      user?: { first_name?: string; last_name?: string; email?: string };
      accounts?: Array<{ id?: number | string; name?: string; product?: string }>;
    };
    const account = (body.accounts ?? []).find(
      (a) => a.product === "harvest" && String(a.id) === String(accountId),
    );
    return { user: body.user ?? {}, account: account ?? {} };
  },
};

export default oauth2;
