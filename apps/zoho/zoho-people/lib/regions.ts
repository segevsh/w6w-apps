/**
 * Zoho's regional data centres, as Zoho People actually serves them.
 *
 * Zoho's own OAuth pages (`oauth-steps.html`) list only six accounts hosts —
 * US, AU, EU, IN, CN, JP. Live probing on 2026-10-06 found **ten**, the same
 * set this pack's `zoho-recruit`/`zohodesk` apps document: every
 * `people.zoho.<tld>` (and `people.zohocloud.ca`) answered
 * `GET /people/api/forms` with Zoho People's own JSON error envelope
 * (`{"response":{"errors":{"code":7202|7213,...},"status":1}}`) — not a DNS
 * failure and not a generic gateway 404. Plausible guesses that do NOT exist
 * (`people.zoho.ca`, `people.zoho.com.sg`) failed to connect, ruling out a
 * wildcard catch-all before trusting the ten that did resolve.
 *
 * **The People API host is `people.zoho.<tld>` directly** (like Recruit's
 * `recruit.zoho.<tld>`), NOT the shared `www.zohoapis.<tld>` gateway the
 * `zoho` (CRM) and `zohobooks` apps sit behind. Note the `api_domain` Zoho's
 * token response returns (`https://www.zohoapis.com`) is therefore NOT the
 * host to call for People.
 *
 * **Canada's accounts host does not follow the pattern**: the API host is
 * `people.zohocloud.ca` and the OAuth host `accounts.zohocloud.ca`.
 *
 * `auth/oauth2.ts` builds ONE `AuthDefinition` per entry, because the OAuth
 * authorization/token host is baked into the flow and cannot be chosen by a
 * field collected mid-flow.
 */
export interface ZohoPeopleRegion {
  /** Short key, used to suffix the auth method's `key` and `displayName`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho People REST API host for this data centre. */
  apiHost: string;
}

export const REGIONS: ZohoPeopleRegion[] = [
  {
    key: "us",
    label: "United States",
    accountsHost: "accounts.zoho.com",
    apiHost: "people.zoho.com",
  },
  { key: "eu", label: "Europe", accountsHost: "accounts.zoho.eu", apiHost: "people.zoho.eu" },
  { key: "in", label: "India", accountsHost: "accounts.zoho.in", apiHost: "people.zoho.in" },
  {
    key: "au",
    label: "Australia",
    accountsHost: "accounts.zoho.com.au",
    apiHost: "people.zoho.com.au",
  },
  { key: "jp", label: "Japan", accountsHost: "accounts.zoho.jp", apiHost: "people.zoho.jp" },
  {
    key: "cn",
    label: "China",
    accountsHost: "accounts.zoho.com.cn",
    apiHost: "people.zoho.com.cn",
  },
  {
    key: "sa",
    label: "Saudi Arabia",
    accountsHost: "accounts.zoho.sa",
    apiHost: "people.zoho.sa",
  },
  {
    key: "ca",
    label: "Canada",
    accountsHost: "accounts.zohocloud.ca",
    apiHost: "people.zohocloud.ca",
  },
  { key: "sg", label: "Singapore", accountsHost: "accounts.zoho.sg", apiHost: "people.zoho.sg" },
  {
    key: "ae",
    label: "United Arab Emirates",
    accountsHost: "accounts.zoho.ae",
    apiHost: "people.zoho.ae",
  },
];

/** Every `apiHost` in {@link REGIONS} — must equal `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
