import type { AuthDefinition } from "@w6w/types";
import { errorDetail, formatPeopleError } from "../lib/client.ts";
import { REGIONS, type ZohoPeopleRegion } from "../lib/regions.ts";

/**
 * OAuth 2.0 (`oauth2-<region>`) — the only connect path Zoho People's current
 * API offers. One `AuthDefinition` per data centre — see `lib/regions.ts`.
 *
 * Zoho specifics, verified 2026-10-06 against
 * `https://www.zoho.com/people/api/oauth-steps.html` and `scopes.html`:
 *   - `access_type=offline` + `prompt=consent` on the authorize URL: without
 *     them Zoho omits the refresh token (access tokens live one hour).
 *   - Scopes are `service.scope.operation`. This app requests
 *     `ZOHOPEOPLE.forms.ALL` (records/forms), `ZOHOPEOPLE.leave.ALL`,
 *     `ZOHOPEOPLE.attendance.ALL` and `ZOHOPEOPLE.timetracker.ALL`. The docs
 *     name the time-tracker scope inconsistently (`timesheet` in the scopes
 *     prose, `timetracker` on every endpoint page and in the scope table);
 *     the endpoint pages win.
 *   - The token endpoint's `api_domain` (`https://www.zohoapis.<tld>`) is NOT
 *     where People lives — requests go to `people.zoho.<tld>`.
 */
function buildOAuth2(region: ZohoPeopleRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho People account was created in the ` +
      `${region.label} data centre (the accounts.zoho hostname you sign in on ends in the ` +
      `matching region) — see the README's "Regional data centres" section.`,
    connectionLabel: `{{fullName}} (${region.label})`,
    oauth2: {
      authorizationUrl: `https://${region.accountsHost}/oauth/v2/auth`,
      tokenUrl: `https://${region.accountsHost}/oauth/v2/token`,
      refreshUrl: `https://${region.accountsHost}/oauth/v2/token`,
      scopes: [
        "ZOHOPEOPLE.forms.ALL",
        "ZOHOPEOPLE.leave.ALL",
        "ZOHOPEOPLE.attendance.ALL",
        "ZOHOPEOPLE.timetracker.ALL",
      ],
      extraAuthParams: { access_type: "offline", prompt: "consent" },
      pkce: true,
    },

    sign({ request, credential }) {
      const { accessToken } = credential as { accessToken: string };
      request.headers["authorization"] = `Zoho-oauthtoken ${accessToken}`;
      return request;
    },

    /**
     * `GET /people/api/forms` — lists form names and permissions only (no
     * employee data, never echoes the credential) and needs only the forms
     * scope. Classified by the vendor's own error `code`, not the HTTP status:
     * a missing/blank header answers HTTP 400 `7202`, a dead token HTTP 401
     * `7213` (both measured live 2026-10-06).
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${apiBase}/people/api/forms`, {
        headers: { accept: "application/json", authorization: `Zoho-oauthtoken ${accessToken}` },
      });
      const text = await res.text();
      const detail = errorDetail(text);
      if (res.ok && !detail?.code) return { ok: true };
      return {
        ok: false,
        message: formatPeopleError(res.status, "GET", "/people/api/forms", text),
      };
    },

    /**
     * Records this region's fixed `apiHost` on the connection (read back by
     * `lib/client.ts#apiHostFromConnection`). Zoho People has no documented
     * "current user" endpoint that needs only these scopes, so the label is
     * the region rather than a name.
     */
    afterConnect() {
      return { apiHost: region.apiHost, region: region.label, fullName: region.label };
    },
  };
}

const oauth2Methods: AuthDefinition[] = REGIONS.map(buildOAuth2);

export default oauth2Methods;
export { buildOAuth2 };
