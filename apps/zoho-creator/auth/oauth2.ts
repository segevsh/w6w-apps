import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX } from "../lib/client.ts";
import { REGIONS, type ZohoCreatorRegion } from "../lib/regions.ts";

/**
 * OAuth 2.0 (`oauth2`) — Zoho Creator's only connect path. Register a Zoho API
 * console client (Server-based Application) for the data centre your Zoho Creator
 * account lives in, store `client_id` / `client_secret` / `redirect_uri` on this w6w
 * installation via `PUT /apps/:id/oauth-config/oauth2-<region>`, and end users then
 * connect via the browser authorization dance.
 *
 * **One `AuthDefinition` per data centre, not one with a region field** — same
 * reasoning as `zohobooks`/`zoho-invoice`/`zoho-analytics`; see `lib/regions.ts`.
 *
 * Zoho Creator specifics, verified 2026-09-29 against
 * `https://www.zoho.com/creator/help/api/v2/oauth-overview.html` and live probes
 * against all nine regional API/accounts hosts:
 *   - `access_type=offline` + `prompt=consent`: the same generic Zoho OAuth
 *     behaviour this pack's other Zoho apps document — without them Zoho omits the
 *     refresh token from the exchange response.
 *   - Scopes are the union every action needs, from `oauth-overview.html`'s own
 *     table: `ZohoCreator.dashboard.READ` (List Applications), `ZohoCreator.
 *     meta.application.READ` (List Forms, List Reports), `ZohoCreator.
 *     meta.form.READ` (List Fields), `ZohoCreator.report.READ` (List Records,
 *     Download File), `ZohoCreator.form.CREATE` (Add Records), `ZohoCreator.
 *     report.UPDATE` (Update Records), `ZohoCreator.report.DELETE` (Delete
 *     Records), `ZohoCreator.report.CREATE` (Upload File) — deliberately not a
 *     broader catch-all, since Creator's scope model is already this granular.
 */
function buildOAuth2(region: ZohoCreatorRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  function authHeader(accessToken: string): Record<string, string> {
    return { authorization: `Zoho-oauthtoken ${accessToken}` };
  }

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho Creator account was created in ` +
      `the ${region.label} data centre (accounts.zoho hostname ends in the matching region) — ` +
      `see the README's "Regional accounts" section if you are not sure which one that is.`,
    oauth2: {
      authorizationUrl: `https://${region.accountsHost}/oauth/v2/auth`,
      tokenUrl: `https://${region.accountsHost}/oauth/v2/token`,
      refreshUrl: `https://${region.accountsHost}/oauth/v2/token`,
      scopes: [
        "ZohoCreator.dashboard.READ",
        "ZohoCreator.meta.application.READ",
        "ZohoCreator.meta.form.READ",
        "ZohoCreator.report.READ",
        "ZohoCreator.form.CREATE",
        "ZohoCreator.report.UPDATE",
        "ZohoCreator.report.DELETE",
        "ZohoCreator.report.CREATE",
      ],
      extraAuthParams: {
        // Without these Zoho omits the refresh token, and the connection dies with
        // the short-lived access token.
        access_type: "offline",
        prompt: "consent",
      },
      pkce: true,
    },

    sign({ request, credential }) {
      const { accessToken } = credential as { accessToken: string };
      request.headers["authorization"] = `Zoho-oauthtoken ${accessToken}`;
      return request;
    },

    /**
     * `GET /creator/v2/meta/applications` — Get Applications, the cheapest
     * authenticated call this app knows: it needs only `ZohoCreator.dashboard.READ`
     * and no `account_owner_name`/`app_link_name` at all (unlike every other Creator
     * endpoint), and returns nothing secret. Classified from the vendor's own
     * `code`, not HTTP status alone: both a missing token and a syntactically
     * plausible but dead one answer the *same* `401
     * {"code":1030,"description":"Authorization Failure..."}` (verified live against
     * `https://www.zohoapis.com/creator/v2/meta/applications`) — unlike Zoho
     * Analytics' two distinguishable codes, Creator's docs only name the one family
     * for this case, so this hook reports it as one problem rather than inventing a
     * distinction the vendor doesn't make.
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${apiBase}${API_PREFIX}/meta/applications`, {
        headers: { accept: "application/json", ...authHeader(accessToken) },
      });
      if (res.ok) return { ok: true };

      const body = await res.json().catch(() => null) as
        | { code?: number; description?: string }
        | null;

      if (body?.code === 1030) {
        return {
          ok: false,
          message: "Zoho Creator rejected the access token (code 1030 / Authorization " +
            "Failure). Reconnect this connection.",
        };
      }
      return {
        ok: false,
        message: `Zoho Creator returned HTTP ${res.status}${
          body?.description ? ` (${body.description}${body.code ? ` / ${body.code}` : ""})` : ""
        } for /meta/applications`,
      };
    },

    /**
     * Records this region's fixed `apiHost` on the connection unconditionally —
     * `lib/client.ts#apiHostFromConnection` reads it back on every action. Unlike
     * Zoho Books/Analytics there is no single default organization/workspace to
     * also record here: every Creator action addresses a specific
     * `account_owner_name`/`app_link_name` pair as a required param (see
     * `lib/params.ts`), since one connection's token can reach many different
     * owners' apps. A failure to reach the API must not fail an otherwise-good
     * connection: `test` has already proven the token works.
     */
    afterConnect() {
      return { apiHost: region.apiHost, region: region.label };
    },
  };
}

const oauth2Methods: AuthDefinition[] = REGIONS.map(buildOAuth2);

export default oauth2Methods;
export { buildOAuth2 };
