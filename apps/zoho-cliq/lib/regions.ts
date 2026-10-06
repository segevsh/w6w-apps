/**
 * Zoho's regional data centres, as Zoho Cliq documents and serves them.
 *
 * Verified 2026-10-06 against the Cliq REST reference
 * (`https://www.zoho.com/cliq/help/restapi/v2/`, "Multiple data centers"
 * table): **nine** domains — `.com`, `.eu`, `.in`, `.com.au`, `.com.cn`, `.jp`,
 * `.sa`, `.uk` and Canada's `.zohocloud.ca`. The page's own prose says "6
 * different domains" while its table lists nine; the table is the one that
 * matches reality — every one of the nine `cliq.zoho.<tld>` hosts was probed
 * unauthenticated on `/api/v2/channels` and answered `401`, and every
 * `accounts.zoho.<tld>` host answered `{"error":"invalid_client"}` on
 * `POST /oauth/v2/token`.
 *
 * **The Cliq API host is `cliq.zoho.<tld>` DIRECTLY** — not the shared
 * `www.zohoapis.<tld>` gateway the CRM/Books apps use. Same shape as
 * `zohodesk`'s `desk.zoho.<tld>` and `zoho-campaigns`' `campaigns.zoho.<tld>`.
 *
 * **Canada breaks the naming pattern on BOTH hosts**, like Campaigns:
 * `cliq.zoho.ca` and `accounts.zoho.ca` do not resolve (`cliq.zoho.ca`
 * confirmed live: curl exit 6); the real hosts are `cliq.zohocloud.ca` and
 * `accounts.zohocloud.ca`, and the Cliq reference lists the former itself.
 *
 * One `AuthDefinition` per region (`auth/oauth2.ts`): the OAuth authorization
 * and token URLs are static per method, so the data centre cannot be a field
 * collected mid-flow.
 */
export interface ZohoCliqRegion {
  /** Short key, used to suffix the auth method's `key`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho Cliq REST API host for this data centre. */
  apiHost: string;
}

export const REGIONS: ZohoCliqRegion[] = [
  {
    key: "us",
    label: "United States",
    accountsHost: "accounts.zoho.com",
    apiHost: "cliq.zoho.com",
  },
  { key: "eu", label: "Europe", accountsHost: "accounts.zoho.eu", apiHost: "cliq.zoho.eu" },
  { key: "in", label: "India", accountsHost: "accounts.zoho.in", apiHost: "cliq.zoho.in" },
  {
    key: "au",
    label: "Australia",
    accountsHost: "accounts.zoho.com.au",
    apiHost: "cliq.zoho.com.au",
  },
  { key: "jp", label: "Japan", accountsHost: "accounts.zoho.jp", apiHost: "cliq.zoho.jp" },
  {
    key: "ca",
    label: "Canada",
    // Both hosts break the `<product>.zoho.<tld>` pattern for Canada.
    accountsHost: "accounts.zohocloud.ca",
    apiHost: "cliq.zohocloud.ca",
  },
  {
    key: "cn",
    label: "China",
    accountsHost: "accounts.zoho.com.cn",
    apiHost: "cliq.zoho.com.cn",
  },
  { key: "sa", label: "Saudi Arabia", accountsHost: "accounts.zoho.sa", apiHost: "cliq.zoho.sa" },
  { key: "uk", label: "United Kingdom", accountsHost: "accounts.zoho.uk", apiHost: "cliq.zoho.uk" },
];

/** Every `apiHost` in {@link REGIONS} — must equal `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
