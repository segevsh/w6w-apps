import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX } from "../lib/client.ts";
import { REGIONS, type ZohoAnalyticsRegion } from "../lib/regions.ts";

/**
 * OAuth 2.0 (`oauth2`) — Zoho Analytics' only connect path. Register a Zoho
 * API console client (Server-based Application) for the data centre your
 * Zoho Analytics account lives in, store `client_id` / `client_secret` /
 * `redirect_uri` on this w6w installation via
 * `PUT /apps/:id/oauth-config/oauth2-<region>`, and end users then connect
 * via the browser authorization dance.
 *
 * **One `AuthDefinition` per data centre, not one with a region field** —
 * same reasoning as `zohobooks`/`zoho-invoice`; see `lib/regions.ts`.
 *
 * Zoho Analytics specifics, verified 2026-09-29 against
 * `https://www.zoho.com/analytics/api/v2/prerequisites.html`,
 * `.../authentication.html` (and its five `authentication/*.html` steps),
 * and live probes against all eight regional API/accounts hosts:
 *   - `access_type=offline` + `prompt=consent` on the authorize URL: without
 *     them Zoho omits the refresh token from the exchange response (the
 *     same generic Zoho OAuth behaviour `zohobooks`/`zoho-invoice` document
 *     for their own products).
 *   - Scopes follow `prerequisites.html`'s "service.scope.operation"
 *     vocabulary. This app requests the union every action needs:
 *     `ZohoAnalytics.metadata.read` (workspace discovery/detail),
 *     `ZohoAnalytics.data.read` (Export Data), `ZohoAnalytics.data.create`
 *     (Add Row, Import Data), `ZohoAnalytics.data.update` (Update Row),
 *     `ZohoAnalytics.data.delete` (Delete Row), `ZohoAnalytics.
 *     usermanagement.read` (Get Workspace Users) and `ZohoAnalytics.
 *     share.read` (Get Org Admins) — deliberately not the broader
 *     `ZohoAnalytics.fullaccess.all` catch-all scope this app does not need.
 *   - The token response's `api_domain` field is a *generic* Zoho OAuth
 *     example (`https://www.zohoapis.com` in the docs' own sample) — not
 *     Analytics' actual API host, which is fixed per region by this method
 *     already (see `lib/regions.ts`). It is not read here for the same
 *     reason `zohobooks` only uses it as a sanity check: Analytics'
 *     dedicated `analyticsapi.zoho.<tld>` host doesn't come back in that
 *     field at all.
 */
function buildOAuth2(region: ZohoAnalyticsRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  function authHeader(accessToken: string): Record<string, string> {
    return { authorization: `Zoho-oauthtoken ${accessToken}` };
  }

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho Analytics account was created in ` +
      `the ${region.label} data centre (accounts.zoho hostname ends in the matching region) — ` +
      `see the README's "Regional accounts" section if you are not sure which one that is.`,
    connectionLabel: `{{primaryWorkspaceName}} (${region.label})`,
    oauth2: {
      authorizationUrl: `https://${region.accountsHost}/oauth/v2/auth`,
      tokenUrl: `https://${region.accountsHost}/oauth/v2/token`,
      refreshUrl: `https://${region.accountsHost}/oauth/v2/token`,
      scopes: [
        "ZohoAnalytics.metadata.read",
        "ZohoAnalytics.data.read",
        "ZohoAnalytics.data.create",
        "ZohoAnalytics.data.update",
        "ZohoAnalytics.data.delete",
        "ZohoAnalytics.usermanagement.read",
        "ZohoAnalytics.share.read",
      ],
      extraAuthParams: {
        // Without these Zoho omits the refresh token, and the connection dies
        // with the 1-hour access token.
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
     * `GET /workspaces/owned` — the cheapest authenticated call this app
     * knows, needing only `ZohoAnalytics.metadata.read` and (like Zoho
     * Books' `GET /organizations`) no `ZANALYTICS-ORGID` header at all.
     * Classified from the vendor's own `data.errorCode`, not HTTP status
     * alone: a request with no usable token answers `400
     * {"status":"failure","summary":"INVALID_TICKET","data":{"errorCode":
     * 8518,...}}` (no Authorization header at all, measured live against
     * `https://analyticsapi.zoho.com/restapi/v2/workspaces/owned`), a
     * syntactically-plausible but dead token answers `401
     * {"status":"failure","summary":"INVALID_OAUTHTOKEN","data":
     * {"errorCode":8535,...}}` (also measured live) — two different
     * problems worth telling apart.
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${apiBase}${API_PREFIX}/workspaces/owned`, {
        headers: { accept: "application/json", ...authHeader(accessToken) },
      });
      if (res.ok) return { ok: true };

      const body = await res.json().catch(() => null) as
        | { summary?: string; data?: { errorCode?: number } }
        | null;
      const code = body?.data?.errorCode;

      if (code === 8535) {
        return {
          ok: false,
          message: "Zoho Analytics rejected the access token (INVALID_OAUTHTOKEN / code 8535). " +
            "Reconnect this connection.",
        };
      }
      if (code === 8518) {
        return {
          ok: false,
          message: "Zoho Analytics received no usable token (INVALID_TICKET / code 8518) — the " +
            "credential did not reach the request.",
        };
      }
      return {
        ok: false,
        message: `Zoho Analytics returned HTTP ${res.status}${
          body?.summary ? ` (${body.summary}${code ? ` / ${code}` : ""})` : ""
        } for /workspaces/owned`,
      };
    },

    /**
     * Records this region's fixed `apiHost` on the connection unconditionally
     * — `lib/client.ts#apiHostFromConnection` reads it back on every action
     * — then, best-effort, the authenticated user's default organization id
     * (from the first owned workspace flagged `isDefault`, or else the
     * first one returned) and that workspace's name, so most row/user/admin
     * actions never need an explicit `organizationId` param (see
     * `lib/client.ts#organizationIdFrom`) and the connection gets a readable
     * label. A failure here must not fail an otherwise-good connection:
     * `test` has already proven the token works.
     */
    async afterConnect({ credential }, ctx) {
      const base: Record<string, unknown> = { apiHost: region.apiHost, region: region.label };
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return base;

      try {
        const res = await ctx.fetch(`${apiBase}${API_PREFIX}/workspaces/owned`, {
          headers: { accept: "application/json", ...authHeader(accessToken) },
        });
        if (!res.ok) return base;
        const body = await res.json() as {
          data?: {
            workspaces?: Array<
              { workspaceId?: string; workspaceName?: string; orgId?: string; isDefault?: boolean }
            >;
          };
        };
        const workspaces = body.data?.workspaces ?? [];
        const primary = workspaces.find((w) => w.isDefault) ?? workspaces[0];
        if (!primary) return base;
        return {
          ...base,
          organizationId: primary.orgId,
          primaryWorkspaceName: primary.workspaceName,
        };
      } catch {
        return base;
      }
    },
  };
}

const oauth2Methods: AuthDefinition[] = REGIONS.map(buildOAuth2);

export default oauth2Methods;
export { buildOAuth2 };
