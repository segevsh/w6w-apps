/**
 * Zoho data centres for WorkDrive.
 *
 * Verified 2026-10-06 against
 * `https://www.zoho.com/workdrive/developer/docs/api/v1/getting-started-multi-dc-support.html`,
 * which lists NINE data centres with their Base API URIs (`https://www.zohoapis.<tld>/workdrive/`):
 * US, EU, India, Australia, China, Japan, UAE (`.ae`), Canada (`zohocloud.ca` accounts host)
 * and Saudi Arabia.
 *
 * One `AuthDefinition` per data centre, not one with a region field: the OAuth authorization
 * and token hosts are baked into the flow, so they cannot be chosen by a field collected
 * mid-flow. The user picks the method matching their account's data centre.
 */
export interface ZohoWorkDriveRegion {
  /** Short key, used to suffix the auth method's `key`. */
  key: string;
  /** Human label for the auth method picker. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** WorkDrive API host for this data centre (the path is `/workdrive/api/v1`). */
  apiHost: string;
}

export const REGIONS: ZohoWorkDriveRegion[] = [
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
  {
    key: "ca",
    label: "Canada",
    accountsHost: "accounts.zohocloud.ca",
    apiHost: "www.zohoapis.ca",
  },
  {
    key: "sa",
    label: "Saudi Arabia",
    accountsHost: "accounts.zoho.sa",
    apiHost: "www.zohoapis.sa",
  },
];

/** Every `apiHost` in {@link REGIONS} — must equal `w6w.network.allow` in `package.json`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);
