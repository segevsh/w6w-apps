import type { AuthDefinition } from "@w6w/types";
import { API_URL, API_VERSION, formatLinkedInAdsError } from "../lib/client.ts";

/**
 * OAuth 2.0 for LinkedIn's **Advertising API program** (Marketing Developer
 * Platform) — the standard Authorization Code flow, but requesting the
 * `rw_ads` / `r_ads_reporting` scopes that only a LinkedIn Developer app
 * approved for that program may request at all.
 *
 * ## This is gated, and a correctly-built app can still fail here
 *
 * Getting `rw_ads` granted to a Developer app is **not self-serve**. LinkedIn
 * runs a "Technical Sign Off" review for the Advertising API program
 * (`integrations/ads/integration-requirements`, read 2026-08-15): OAuth
 * integration, account-hierarchy retrieval, campaign CRUD, targeting parity
 * and reporting are all demoed to a LinkedIn BD contact before access is
 * awarded. Until an app clears that review, LinkedIn's authorization
 * endpoint either rejects the request outright (`unauthorized_scope_error`)
 * or a subsequent call answers **403**, not a bad-credential 401 — see
 * `test` below, which reads the response body specifically to tell these
 * apart rather than reporting every non-2xx as "bad credential".
 *
 * ## Development-tier accounts must be mapped by hand
 *
 * A newly-approved app starts at the Advertising API's **development tier**,
 * which can only see Ad Accounts explicitly added to it in the Developer
 * Portal (Products tab → "View Ad Accounts" → "Add Ad Account", by the
 * 9-digit Account ID from Campaign Manager). `ad-account-list` returning
 * empty for a connection that should see accounts is this, not a bug —
 * see the README.
 *
 * ## Scopes
 *
 * - `rw_ads` — read/write across Ad Accounts, Campaign Groups, Campaigns and
 *   Creatives. LinkedIn's own guidance ("Marketing APIs require the rw_ads
 *   scope") is why this app requests the read/write scope rather than the
 *   read-only `r_ads` alternative — every write action here needs it, and a
 *   read/write grant covers the read actions too.
 * - `r_ads_reporting` — required separately for `analytics-get` /
 *   `analytics-get-statistics`; the reporting docs list it as its own
 *   permission, not implied by `rw_ads`.
 *
 * `rw_dmp_segments` (Matched Audiences) is deliberately **not** requested
 * here — see `auth/oauth2-audiences.ts` for why it's a second auth method.
 *
 * ## Refresh tokens
 *
 * The Advertising API program's own Technical Sign-Off checklist
 * (`ADS-005`/`ADS-006`) requires demonstrating refresh-token use, so an
 * approved app is expected to receive one (access token ~60 days, refresh
 * token longer-lived) — unlike the free consumer scopes in the sibling
 * `linkedin` app, which get none. No custom `refresh` hook is declared: when
 * the stored credential carries a `refreshToken`, the runtime's built-in
 * handler renews it against `tokenUrl` with the standard
 * `grant_type=refresh_token` exchange.
 *
 * PKCE is off: LinkedIn's documented authorization/token requests for this
 * flow carry no `code_challenge`/`code_verifier`, mirroring the sibling app.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Advertising API)",
  description:
    "Manage Ad Accounts, Campaign Groups, Campaigns and Creatives, and read performance " +
    "analytics. Requires a LinkedIn Developer app approved for the Advertising API program " +
    "(Marketing Developer Platform) — a correctly-configured app still fails to connect until " +
    "LinkedIn grants that access.",
  connectionLabel: "LinkedIn Ads",
  oauth2: {
    authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["rw_ads", "r_ads_reporting"],
    scopeSeparator: " ",
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /rest/adAccounts?q=search` with no `search=` filter — LinkedIn
   * documents that shape as returning "all accounts the caller has access
   * to", so it needs only `r_ads`/`rw_ads`, returns 200 with an empty
   * `elements` array for a freshly-approved connection with zero mapped
   * accounts (not a failure), and carries nothing sensitive to leak into a
   * stored health result.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_URL}/rest/adAccounts?q=search`, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
        "x-restli-protocol-version": "2.0.0",
        "linkedin-version": API_VERSION,
      },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    if (res.status === 403) {
      return {
        ok: false,
        message: "LinkedIn returned 403 for the Ads API. This usually means the connected " +
          "Developer app hasn't been approved for the Advertising API program (Marketing " +
          "Developer Platform) yet, or a Technical Sign Off is still pending — a valid access " +
          `token is not enough on its own. Detail: ${
            formatLinkedInAdsError(
              res.status,
              "GET",
              "/rest/adAccounts",
              raw,
            )
          }`,
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `LinkedIn rejected the access token: ${
          formatLinkedInAdsError(res.status, "GET", "/rest/adAccounts", raw)
        }`,
      };
    }
    return {
      ok: false,
      message: formatLinkedInAdsError(res.status, "GET", "/rest/adAccounts", raw),
    };
  },
};

export default oauth2;
