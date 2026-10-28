/**
 * Zoho's regional data centres, as Zoho Analytics documents and serves them.
 *
 * Every real endpoint page under `https://www.zoho.com/analytics/api/v2/` —
 * `prerequisites.html`, `metadata-api/workspace-details.html`,
 * `bulk-api/import-data/new-table.html`, `data-api/update-row.html`, and
 * every other action page — writes its request URI as
 * `https://<ZohoAnalytics_Server_URI>/restapi/v2/...`, a placeholder rather
 * than one fixed host, confirming Analytics is multi-DC the same way this
 * pack's other Zoho apps are. The docs never spell out the exact per-DC host
 * table, so it was verified live (2026-09-29) instead: every concrete `curl`
 * sample throughout those pages uses `analyticsapi.zoho.com` (not the
 * `www.zohoapis.<tld>` gateway `zohobooks`/`zoho-invoice` use, and not the
 * `analytics.zoho.com` alias the REST API Postman-collection page's example
 * `analytics-domain` variable happens to name — both resolve, but every
 * copy-paste-ready sample in the docs uses `analyticsapi.zoho.<tld>`, so
 * that's the host this app addresses).
 *
 * Each of `analyticsapi.zoho.{com,eu,in,com.au,jp,com.cn,sa}` was probed
 * unauthenticated live and answered the identical documented envelope —
 * `400 {"status":"failure","summary":"INVALID_TICKET","data":{"errorCode":
 * 8518,"errorMessage":"You need to (re)login to perform this operation"}}`
 * — not a generic gateway 404. `analyticsapi.zoho.ca` does **not** resolve
 * at all; `analyticsapi.zohocloud.ca` does, and answers the same envelope.
 * This is the same Canada oddity `zohobooks`/`zoho-invoice` document for
 * their OAuth (`accounts.zoho.<tld>`) host, except here it is the **API**
 * host itself that follows the `zohocloud.ca` naming, one degree more
 * surprising than the OAuth-only case. The OAuth/accounts hosts were
 * reprobed too and match those sibling apps exactly: all seven
 * `accounts.zoho.<tld>` plus `accounts.zohocloud.ca` answer `302` (a real
 * redirect to the Zoho login page) for a syntactically valid authorize
 * request; `accounts.zoho.ca` does not resolve.
 *
 * `auth/oauth2.ts` builds ONE `AuthDefinition` per entry below rather than a
 * single method with a "data centre" field, for the same reason
 * `zohobooks`/`zoho-invoice` do: the OAuth authorization/token host is baked
 * into the auth flow itself (RFC `auth.md`'s `oauth2.authorizationUrl` /
 * `tokenUrl` are static per method), so it cannot be chosen by a field
 * collected mid-flow. The user picks the auth method matching their Zoho
 * Analytics account's data centre; the app's `network.allow` lists every
 * `apiHost` below so any of the eight can be connected.
 */
export interface ZohoAnalyticsRegion {
  /** Short key, used to suffix the auth method's `key` and `displayName`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho Analytics REST API host for this data centre. */
  apiHost: string;
}

export const REGIONS: ZohoAnalyticsRegion[] = [
  {
    key: "us",
    label: "United States",
    accountsHost: "accounts.zoho.com",
    apiHost: "analyticsapi.zoho.com",
  },
  { key: "eu", label: "Europe", accountsHost: "accounts.zoho.eu", apiHost: "analyticsapi.zoho.eu" },
  { key: "in", label: "India", accountsHost: "accounts.zoho.in", apiHost: "analyticsapi.zoho.in" },
  {
    key: "au",
    label: "Australia",
    accountsHost: "accounts.zoho.com.au",
    apiHost: "analyticsapi.zoho.com.au",
  },
  { key: "jp", label: "Japan", accountsHost: "accounts.zoho.jp", apiHost: "analyticsapi.zoho.jp" },
  {
    key: "ca",
    label: "Canada",
    accountsHost: "accounts.zohocloud.ca",
    apiHost: "analyticsapi.zohocloud.ca",
  },
  {
    key: "cn",
    label: "China",
    accountsHost: "accounts.zoho.com.cn",
    apiHost: "analyticsapi.zoho.com.cn",
  },
  {
    key: "sa",
    label: "Saudi Arabia",
    accountsHost: "accounts.zoho.sa",
    apiHost: "analyticsapi.zoho.sa",
  },
];

/** Every `apiHost` in {@link REGIONS} — must equal `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
