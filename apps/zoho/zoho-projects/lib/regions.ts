/**
 * Zoho data centres for Zoho Projects.
 *
 * Verified 2026-10-06 against the V3 reference (`https://projects.zoho.com/api-docs`, "API
 * endpoints by data center"), which lists ELEVEN API base URLs — `https://projects.<tld>` for
 * US, EU, IN, AU, JP, CA (`zohocloud.ca`), CN, SA, UK, UAE and SG. The OAuth hosts are the
 * matching `accounts.zoho.<tld>` servers (each answered on 2026-10-06; Zoho's multi-DC page
 * lists UK and CA/SA explicitly).
 *
 * One `AuthDefinition` per data centre, not one with a region field: the OAuth authorization
 * and token hosts are baked into the flow, so they cannot be chosen by a field collected
 * mid-flow. The user picks the method matching their account's data centre.
 */
export interface ZohoProjectsRegion {
  /** Short key, used to suffix the auth method's `key`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Zoho Projects API host for this data centre (the path is `/api/v3/...`). */
  apiHost: string;
}

export const REGIONS: ZohoProjectsRegion[] = [
  {
    key: "us",
    label: "United States",
    accountsHost: "accounts.zoho.com",
    apiHost: "projects.zoho.com",
  },
  {
    key: "eu",
    label: "Europe",
    accountsHost: "accounts.zoho.eu",
    apiHost: "projects.zoho.eu",
  },
  {
    key: "in",
    label: "India",
    accountsHost: "accounts.zoho.in",
    apiHost: "projects.zoho.in",
  },
  {
    key: "au",
    label: "Australia",
    accountsHost: "accounts.zoho.com.au",
    apiHost: "projects.zoho.com.au",
  },
  {
    key: "jp",
    label: "Japan",
    accountsHost: "accounts.zoho.jp",
    apiHost: "projects.zoho.jp",
  },
  {
    key: "ca",
    label: "Canada",
    accountsHost: "accounts.zohocloud.ca",
    apiHost: "projects.zohocloud.ca",
  },
  {
    key: "cn",
    label: "China",
    accountsHost: "accounts.zoho.com.cn",
    apiHost: "projects.zoho.com.cn",
  },
  {
    key: "sa",
    label: "Saudi Arabia",
    accountsHost: "accounts.zoho.sa",
    apiHost: "projects.zoho.sa",
  },
  {
    key: "uk",
    label: "United Kingdom",
    accountsHost: "accounts.zoho.uk",
    apiHost: "projects.zoho.uk",
  },
  {
    key: "ae",
    label: "United Arab Emirates",
    accountsHost: "accounts.zoho.ae",
    apiHost: "projects.zoho.ae",
  },
  {
    key: "sg",
    label: "Singapore",
    accountsHost: "accounts.zoho.sg",
    apiHost: "projects.zoho.sg",
  },
];

/** Every `apiHost` in {@link REGIONS} — must equal `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
