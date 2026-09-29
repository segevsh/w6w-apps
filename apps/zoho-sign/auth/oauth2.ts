import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX } from "../lib/client.ts";
import { REGIONS, type ZohoSignRegion } from "../lib/regions.ts";

/**
 * OAuth 2.0 (`oauth2`) — Zoho Sign's only connect path. Register a Zoho API console client
 * for the data centre your organization lives in, store `client_id` / `client_secret` /
 * `redirect_uri` on this w6w installation, and end users then connect via the browser
 * authorization dance.
 *
 * **One `AuthDefinition` per data centre, not one with a region field.** See `lib/regions.ts`
 * for why: the OAuth authorization/token host is baked into the flow itself, so it cannot be
 * chosen by a field collected mid-flow — the browser has already been redirected to a
 * specific `accounts.zoho.<tld>` (or `accounts.zohocloud.ca`, Canada's odd one out — see
 * `lib/regions.ts`) by the time any such field would be read. The user picks the method
 * matching their organization's data centre; every other detail (scopes, header shape, probe)
 * is identical across all ten.
 *
 * Zoho Sign specifics, verified 2026-09-29:
 *   - `access_type=offline` + `prompt=consent` on the authorize URL — documented explicitly
 *     on `getting-started.html`'s "Generating grant token" step; without them Zoho omits the
 *     refresh token from the exchange response, same rule as every other Zoho product in this
 *     pack.
 *   - Scopes: `oauth.html` documents `ZohoSign.documents.{CREATE,READ,UPDATE}` and
 *     `ZohoSign.templates.{CREATE,READ,UPDATE}` as the scope families this app's actions
 *     need. `ZohoSign.documents.DELETE` is additionally requested — not listed on that
 *     table, but it appears as a real scope in Zoho's own "Generating grant token" request
 *     example on `getting-started.html`, and `document-managment/delete-document.html` /
 *     `recall-document.html` need *some* documents-family scope beyond `.UPDATE`.
 *     `ZohoSign.templates.DELETE` is requested by the same reasoning (the documents family's
 *     CREATE/READ/UPDATE/DELETE verb set is otherwise symmetric with templates') but is
 *     UNCONFIRMED — `template-managment/delete-template.html` documents the endpoint, not the
 *     scope it needs. `ZohoSign.account.*` (User Management) is deliberately not requested:
 *     this app implements no user-management actions (see `index.ts`).
 *   - `Authorization: Zoho-oauthtoken <token>` — confirmed live: `getting-started.html`'s
 *     "Calling an API" section states the header value shape verbatim, and every probe below
 *     round-trips it.
 */
function buildOAuth2(region: ZohoSignRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  function authHeader(accessToken: string): Record<string, string> {
    return { authorization: `Zoho-oauthtoken ${accessToken}` };
  }

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho Sign organization was created in ` +
      `the ${region.label} data centre — see the README's "Regional accounts" section if you ` +
      `are not sure which one that is.`,
    connectionLabel: `Zoho Sign (${region.label})`,
    oauth2: {
      authorizationUrl: `https://${region.accountsHost}/oauth/v2/auth`,
      tokenUrl: `https://${region.accountsHost}/oauth/v2/token`,
      refreshUrl: `https://${region.accountsHost}/oauth/v2/token`,
      scopes: [
        "ZohoSign.documents.CREATE",
        "ZohoSign.documents.READ",
        "ZohoSign.documents.UPDATE",
        "ZohoSign.documents.DELETE",
        "ZohoSign.templates.CREATE",
        "ZohoSign.templates.READ",
        "ZohoSign.templates.UPDATE",
        "ZohoSign.templates.DELETE",
      ],
      extraAuthParams: {
        // Without these Zoho omits the refresh token, and the connection dies with the
        // 1-hour access token.
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
     * `GET /templates` — the cheapest authenticated call this app knows, needing only
     * `ZohoSign.templates.READ` and no path parameter at all. Classified by the vendor's own
     * `code`/`status`, never by HTTP status alone: a request with no usable token answers
     * `401 {"code":9031,"message":"Ticket invalid","status":"failure"}` (measured live, no
     * Authorization header at all), a syntactically-plausible but dead token answers `401
     * {"code":9041,"message":"Invalid Oauth token","status":"failure"}` — two different
     * problems worth telling apart.
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${apiBase}${API_PREFIX}/templates`, {
        headers: { accept: "application/json", ...authHeader(accessToken) },
      });
      if (res.ok) return { ok: true };

      const body = await res.json().catch(() => null) as
        | { code?: number; message?: string }
        | null;

      if (body?.code === 9041) {
        return {
          ok: false,
          message: "Zoho Sign rejected the access token (code 9041). Reconnect this connection.",
        };
      }
      if (body?.code === 9031) {
        return {
          ok: false,
          message:
            "Zoho Sign received no usable token (code 9031) — the credential did not reach the request.",
        };
      }
      return {
        ok: false,
        message:
          `Zoho Sign returned HTTP ${res.status}${body?.code ? ` (code ${body.code})` : ""} ` +
          "for /templates",
      };
    },

    /**
     * Records this region's fixed `apiHost` on the connection unconditionally —
     * `lib/client.ts#apiHostFromConnection` reads it back on every action. Zoho Sign
     * publishes no confirmed "whoami" endpoint for this app to enrich the connection label
     * with further (the User Management section that would cover it is deliberately not
     * implemented — see `index.ts`), so `afterConnect` stays a pure, no-network recorder
     * rather than guessing at an unverified call.
     */
    afterConnect() {
      return { apiHost: region.apiHost, region: region.label };
    },
  };
}

const oauth2Methods: AuthDefinition[] = REGIONS.map(buildOAuth2);

export default oauth2Methods;
export { buildOAuth2 };
