/**
 * Zoho Sign's regional data centres, as Zoho Sign documents them.
 *
 * Verified live 2026-09-29 against `https://www.zoho.com/sign/api/api-endpoint.html`
 * ("API Root Endpoint" — the domain table below is quoted verbatim) and probed directly:
 * every `https://sign.zoho.<tld>/api/v1/templates` answered `401
 * {"code":9031,"message":"Ticket invalid","status":"failure"}` (not a catch-all 200 or a
 * generic 404), and every `https://accounts.zoho.<tld>/oauth/v2/auth` (and
 * `accounts.zohocloud.ca`) answered `302` for a syntactically valid authorize request.
 *
 * Zoho Sign supports **ten** data centres — two more than this pack's `zohobooks` app (no
 * China, but adds the United Kingdom, Singapore and the United Arab Emirates).
 *
 * **Canada is the one region where BOTH the API host and the OAuth host break the
 * `zoho.<tld>` pattern the other nine follow** — not just the accounts host, unlike
 * `zohobooks`/`zohomail`'s Canadian entry. Zoho Sign's own domain table gives Canada's
 * domain as `.zohocloud.ca`, meaning the whole `zoho.<tld>` segment is replaced, not just
 * the TLD appended after it. Probed live: `sign.zoho.ca` and `accounts.zoho.ca` both fail to
 * connect at all, while `sign.zohocloud.ca` and `accounts.zohocloud.ca` both answer correctly
 * (`401`/`302` respectively). Assuming the eight-of-ten pattern holds for Canada breaks BOTH
 * halves of the OAuth flow for exactly that one region, in a way that looks like two typos
 * rather than one documented fact.
 *
 * `auth/oauth2.ts` builds ONE `AuthDefinition` per entry below rather than a single method
 * with a "data centre" field — see `zohobooks/lib/regions.ts` for why: the OAuth
 * authorization/token host is baked into the auth flow itself (RFC `auth.md`'s
 * `oauth2.authorizationUrl` / `tokenUrl` are static per method), so a field collected
 * mid-flow cannot retarget which host the browser is already redirected to.
 */
export interface ZohoSignRegion {
  /** Short key, used to suffix the auth method's `key` and `displayName`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho Sign REST API host for this data centre. */
  apiHost: string;
}

export const REGIONS: ZohoSignRegion[] = [
  {
    key: "us",
    label: "United States",
    accountsHost: "accounts.zoho.com",
    apiHost: "sign.zoho.com",
  },
  { key: "eu", label: "Europe", accountsHost: "accounts.zoho.eu", apiHost: "sign.zoho.eu" },
  { key: "in", label: "India", accountsHost: "accounts.zoho.in", apiHost: "sign.zoho.in" },
  {
    key: "au",
    label: "Australia",
    accountsHost: "accounts.zoho.com.au",
    apiHost: "sign.zoho.com.au",
  },
  { key: "jp", label: "Japan", accountsHost: "accounts.zoho.jp", apiHost: "sign.zoho.jp" },
  {
    key: "ca",
    label: "Canada",
    accountsHost: "accounts.zohocloud.ca",
    apiHost: "sign.zohocloud.ca",
  },
  { key: "sa", label: "Saudi Arabia", accountsHost: "accounts.zoho.sa", apiHost: "sign.zoho.sa" },
  { key: "uk", label: "United Kingdom", accountsHost: "accounts.zoho.uk", apiHost: "sign.zoho.uk" },
  { key: "sg", label: "Singapore", accountsHost: "accounts.zoho.sg", apiHost: "sign.zoho.sg" },
  {
    key: "ae",
    label: "United Arab Emirates",
    accountsHost: "accounts.zoho.ae",
    apiHost: "sign.zoho.ae",
  },
];

/** Every `apiHost` in {@link REGIONS} — must equal `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
