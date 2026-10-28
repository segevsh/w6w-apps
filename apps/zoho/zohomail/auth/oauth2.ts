import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX } from "../lib/client.ts";
import { REGIONS, type ZohoMailRegion } from "../lib/regions.ts";

/**
 * OAuth 2.0 (`oauth2`) — Zoho Mail's only connect path. Register a Zoho API
 * console client (Server-based Applications) for the data centre your
 * account lives in, store `client_id` / `client_secret` / `redirect_uri` on
 * this w6w installation via `PUT /apps/:id/oauth-config/oauth2-<region>`, and
 * end users then connect via the browser authorization dance.
 *
 * **One `AuthDefinition` per data centre, not one with a region field.** See
 * `lib/regions.ts` for why: the OAuth authorization/token host is baked into
 * the flow itself, so it cannot be chosen by a field collected mid-flow — the
 * browser has already been redirected to a specific `accounts.zoho.<tld>` by
 * the time any such field would be read. The user picks the method matching
 * their account's data centre; every other detail (scopes, header shape,
 * probe) is identical across all eight.
 *
 * Zoho specifics, verified 2026-08-15 against
 * `https://www.zoho.com/mail/help/api/` and its linked per-endpoint pages:
 *   - `access_type=offline` + `prompt=consent` on the authorize URL: without
 *     them Zoho omits the refresh token from the exchange response.
 *   - Scopes are `ZohoMail.accounts.READ` (accounts — also the `test`/quota
 *     probe surface), `ZohoMail.folders.ALL`, `ZohoMail.messages.ALL` and
 *     `ZohoMail.tags.ALL` (labels) — the union every action in this app
 *     needs. Zoho Mail's own scope vocabulary is per-resource with `.ALL` /
 *     `.READ` / `.CREATE` / `.UPDATE` / `.DELETE` suffixes, unlike Zoho CRM's
 *     module-wide `ZohoCRM.modules.ALL`.
 *   - The token response's `api_domain` field (present on other Zoho
 *     products' OAuth responses) is read defensively if present, but is not
 *     relied on: unlike Zoho CRM — a single generic API gateway shared by
 *     several products — Zoho Mail's product host (`mail.zoho.<tld>`) is
 *     fixed per data centre and known at auth-method-build time, so
 *     `afterConnect` records the region's own `apiHost` regardless.
 */
function buildOAuth2(region: ZohoMailRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  function authHeader(accessToken: string): Record<string, string> {
    return { authorization: `Zoho-oauthtoken ${accessToken}` };
  }

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho Mail account was created in the ` +
      `${region.label} data centre (accounts.zoho hostname ends in the matching region) — see the ` +
      `README's "Regional accounts" section if you are not sure which one that is.`,
    connectionLabel: `{{primaryEmailAddress}} (${region.label})`,
    oauth2: {
      authorizationUrl: `https://${region.accountsHost}/oauth/v2/auth`,
      tokenUrl: `https://${region.accountsHost}/oauth/v2/token`,
      refreshUrl: `https://${region.accountsHost}/oauth/v2/token`,
      scopes: [
        "ZohoMail.accounts.READ",
        "ZohoMail.folders.ALL",
        "ZohoMail.messages.ALL",
        "ZohoMail.tags.ALL",
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
     * `GET /api/accounts` — the cheapest authenticated call this app knows,
     * needing only the always-requested `ZohoMail.accounts.READ` scope.
     * Classified by the vendor's own `errorCode`, not by HTTP status alone:
     * a request with no usable token answers `400 INVALID_TICKET`
     * (`https://mail.zoho.com/api/accounts` with no Authorization header,
     * measured live), a syntactically-plausible but dead token answers
     * `401 INVALID_OAUTHTOKEN` — two different problems worth telling apart.
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${apiBase}${API_PREFIX}/accounts`, {
        headers: { accept: "application/json", ...authHeader(accessToken) },
      });
      if (res.ok) return { ok: true };

      const body = await res.json().catch(() => null) as
        | { data?: { errorCode?: string; moreInfo?: string } }
        | null;
      const errorCode = body?.data?.errorCode;

      if (errorCode === "INVALID_OAUTHTOKEN") {
        return {
          ok: false,
          message:
            "Zoho Mail rejected the access token (INVALID_OAUTHTOKEN). Reconnect this connection.",
        };
      }
      if (errorCode === "INVALID_TICKET") {
        return {
          ok: false,
          message:
            "Zoho Mail received no usable token (INVALID_TICKET) — the credential did not reach " +
            "the request.",
        };
      }
      return {
        ok: false,
        message: `Zoho Mail returned HTTP ${res.status}${errorCode ? ` (${errorCode})` : ""} for ` +
          "/api/accounts",
      };
    },

    /**
     * Records this region's fixed `apiHost` on the connection unconditionally
     * — `lib/client.ts#apiHostFromConnection` reads it back on every action —
     * then, best-effort, the authenticated user's primary mailbox id and
     * address so most actions never need an explicit `accountId` param (see
     * `lib/client.ts#accountIdFrom`) and the connection gets a readable
     * label. A failure here must not fail an otherwise-good connection: `test`
     * has already proven the token works.
     */
    async afterConnect({ credential }, ctx) {
      const base: Record<string, unknown> = { apiHost: region.apiHost, region: region.label };
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return base;

      try {
        const res = await ctx.fetch(`${apiBase}${API_PREFIX}/accounts`, {
          headers: { accept: "application/json", ...authHeader(accessToken) },
        });
        if (!res.ok) return base;
        const body = await res.json() as {
          data?: Array<{ accountId?: string; primaryEmailAddress?: string; displayName?: string }>;
        };
        const primary = body.data?.[0];
        if (!primary) return base;
        return {
          ...base,
          accountId: primary.accountId,
          primaryEmailAddress: primary.primaryEmailAddress,
          displayName: primary.displayName,
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
