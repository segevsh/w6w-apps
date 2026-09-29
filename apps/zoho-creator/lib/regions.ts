/**
 * Zoho's regional data centres, as Zoho Creator documents and serves them.
 *
 * `https://www.zoho.com/creator/help/api/v2/oauth-overview.html` publishes an explicit
 * "API endpoints by data centre" table — unlike Zoho Analytics, whose docs only ever
 * write a `<ZohoAnalytics_Server_URI>` placeholder and leave the concrete host table to
 * be inferred from `curl` samples. Creator's table names all **nine** data centres and
 * their API base URL directly:
 *
 * | Data centre | API base URL |
 * |---|---|
 * | United States (US) | www.zohoapis.com |
 * | European Union (EU) | www.zohoapis.eu |
 * | India (IN) | www.zohoapis.in |
 * | Australia (AU) | www.zohoapis.com.au |
 * | Japan (JP) | www.zohoapis.jp |
 * | Canada (CA) | www.zohoapis.ca |
 * | Saudi Arabia (SA) | www.zohoapis.sa |
 * | China (CN) | www.zohoapis.com.cn |
 * | United Arab Emirates (UAE) | www.zohoapis.ae |
 *
 * That is the **same shared `www.zohoapis.<tld>` gateway** `zohobooks`/`zoho-invoice`
 * address — not a dedicated `creator.zoho.<tld>` host, despite that being the more
 * "obvious" guess this app's task brief called out to verify rather than assume.
 * `things-to-know.html` even confirms it from the other direction: "In the downloaded
 * OAS files, the Base URL would be that of the US DC (creator.zoho.com) by default" —
 * `creator.zoho.com` is real (it 302-redirects to the product's own login/app UI) but is
 * a **product URL, not the REST API host**; every concrete `curl` sample across every
 * endpoint page in the docs (`add-records.html`, `get-records.html`, `get-fields.html`,
 * `upload-file.html`, ...) addresses `www.zohoapis.<tld>`, and that is what this app's
 * `network.allow` and `apiHost` values point at.
 *
 * **Unlike `zohobooks`/`zoho-invoice`/`zoho-analytics`, Canada's API host does NOT break
 * the naming pattern here** — only its OAuth/accounts host does, the narrower of the two
 * quirks this pack's other Zoho apps document. Verified live 2026-09-29:
 * `www.zohoapis.ca/creator/v2/data/x/x/report/x` resolves and answers the documented
 * `{"code":1030,"description":"Authorization Failure...` envelope, identical to all
 * eight sibling API hosts — `www.zohoapis.ca` is a normal member of the
 * `www.zohoapis.<tld>` family. `accounts.zoho.ca` still does not resolve at all (as for
 * every other Zoho product in this pack); `accounts.zohocloud.ca` does, and answers
 * `302` (a real redirect to the Zoho login page) for a syntactically valid authorize
 * request — so only `auth/oauth2.ts`'s `oauth2-ca` accounts host needs the substitution,
 * not `apiHost`.
 *
 * `auth/oauth2.ts` builds ONE `AuthDefinition` per entry below rather than a single
 * method with a "data centre" field, for the same reason `zohobooks`/`zoho-invoice`/
 * `zoho-analytics` do: the OAuth authorization/token host is baked into the auth flow
 * itself (RFC `auth.md`'s `oauth2.authorizationUrl`/`tokenUrl` are static per method), so
 * it cannot be chosen by a field collected mid-flow. The user picks the auth method
 * matching their Zoho Creator account's data centre; the app's `network.allow` lists
 * every `apiHost` below so any of the nine can be connected.
 */
export interface ZohoCreatorRegion {
  /** Short key, used to suffix the auth method's `key` and `displayName`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho Creator REST API host for this data centre (the shared `www.zohoapis.<tld>` gateway). */
  apiHost: string;
}

export const REGIONS: ZohoCreatorRegion[] = [
  {
    key: "us",
    label: "United States",
    accountsHost: "accounts.zoho.com",
    apiHost: "www.zohoapis.com",
  },
  { key: "eu", label: "Europe", accountsHost: "accounts.zoho.eu", apiHost: "www.zohoapis.eu" },
  { key: "in", label: "India", accountsHost: "accounts.zoho.in", apiHost: "www.zohoapis.in" },
  {
    key: "au",
    label: "Australia",
    accountsHost: "accounts.zoho.com.au",
    apiHost: "www.zohoapis.com.au",
  },
  { key: "jp", label: "Japan", accountsHost: "accounts.zoho.jp", apiHost: "www.zohoapis.jp" },
  {
    key: "ca",
    label: "Canada",
    // Only the accounts host breaks the pattern here — see the module doc.
    accountsHost: "accounts.zohocloud.ca",
    apiHost: "www.zohoapis.ca",
  },
  {
    key: "sa",
    label: "Saudi Arabia",
    accountsHost: "accounts.zoho.sa",
    apiHost: "www.zohoapis.sa",
  },
  {
    key: "cn",
    label: "China",
    accountsHost: "accounts.zoho.com.cn",
    apiHost: "www.zohoapis.com.cn",
  },
  {
    key: "ae",
    label: "United Arab Emirates",
    accountsHost: "accounts.zoho.ae",
    apiHost: "www.zohoapis.ae",
  },
];

/** Every `apiHost` in {@link REGIONS} — must equal `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
