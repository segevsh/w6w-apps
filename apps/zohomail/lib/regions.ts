/**
 * Zoho's regional data centres.
 *
 * Zoho hosts every account in exactly one of several regional data centres,
 * each with its own OAuth host (`accounts.zoho.<tld>`) and its own API host
 * (`mail.zoho.<tld>`) — an account created in the EU data centre cannot
 * authorize against `accounts.zoho.com`, and its mail lives on `mail.zoho.eu`,
 * not `mail.zoho.com`. This is the same shape this pack's `zoho` (Zoho CRM)
 * app documents for `accounts.zoho.<tld>` / `www.zohoapis.<tld>` — Zoho Mail's
 * product host just uses a different subdomain convention (`mail.` rather than
 * `www.zohoapis.`).
 *
 * All eight hosts below were probed live on 2026-08-15:
 *   - every `mail.zoho.<tld>/api/accounts` answered `400 {"data":{"errorCode":
 *     "INVALID_TICKET", ...}}` unauthenticated — the exact documented shape,
 *     not a catch-all 200 or a generic 404;
 *   - every `accounts.zoho.<tld>/oauth/v2/auth` answered `302` (redirect to
 *     the Zoho login page) for a syntactically valid authorize request.
 *
 * `oauth2.ts` builds ONE `AuthDefinition` per entry below rather than a single
 * method with a "data centre" field, because the OAuth authorization/token
 * host is baked into the auth flow itself (RFC `auth.md`'s `oauth2.
 * authorizationUrl` / `tokenUrl` are static per method) — a field collected
 * mid-flow cannot retarget which host the browser is already redirected to.
 * The user picks the auth method matching their account's data centre; the
 * app's `network.allow` lists every `apiHost` below so any of the eight can
 * be connected.
 */
export interface ZohoMailRegion {
  /** Short key, used to suffix the auth method's `key` and `displayName`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho Mail REST API host for this data centre. */
  apiHost: string;
}

export const REGIONS: ZohoMailRegion[] = [
  {
    key: "us",
    label: "United States",
    accountsHost: "accounts.zoho.com",
    apiHost: "mail.zoho.com",
  },
  { key: "eu", label: "Europe", accountsHost: "accounts.zoho.eu", apiHost: "mail.zoho.eu" },
  { key: "in", label: "India", accountsHost: "accounts.zoho.in", apiHost: "mail.zoho.in" },
  {
    key: "au",
    label: "Australia",
    accountsHost: "accounts.zoho.com.au",
    apiHost: "mail.zoho.com.au",
  },
  { key: "jp", label: "Japan", accountsHost: "accounts.zoho.jp", apiHost: "mail.zoho.jp" },
  {
    key: "cn",
    label: "China",
    accountsHost: "accounts.zoho.com.cn",
    apiHost: "mail.zoho.com.cn",
  },
  {
    key: "ca",
    label: "Canada",
    accountsHost: "accounts.zohocloud.ca",
    apiHost: "mail.zohocloud.ca",
  },
  { key: "sa", label: "Saudi Arabia", accountsHost: "accounts.zoho.sa", apiHost: "mail.zoho.sa" },
];

/** Every `apiHost` in {@link REGIONS} — must equal `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
