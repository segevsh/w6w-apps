/**
 * Bigin's regional data centres, as Bigin documents them.
 *
 * Bigin is not served from one shared host. Every account lives in exactly one
 * of eight regional data centres, each with its own API host
 * (`www.zohoapis.<tld>`) and its own OAuth host (`accounts.zoho.<tld>`).
 * Verified live 2026-09-22 against
 * `https://www.bigin.com/developer/docs/apis/v2/multi-dc.html` ("Multi-DC
 * Support for Bigin APIs"), whose "Data centers and their domain URLs" table
 * lists exactly the eight pairs below — the same shape this pack's
 * `zohobooks` app documents for Zoho Books, and the same eight API hosts
 * (only the path prefix differs: Bigin is `/bigin/v2/`, not `/books/v3/`).
 *
 * **Canada is the one region where the API host and the accounts host DISAGREE
 * in naming.** The documented Canadian API host is `www.zohoapis.ca` — the
 * plain pattern, same as every other region — but there is no
 * `accounts.zoho.ca`: the documented OAuth host is `accounts.zohocloud.ca`.
 * Normalizing Canada to `accounts.zoho.<tld>` because the other seven follow
 * that pattern breaks OAuth for exactly one region, in a way that reads like a
 * typo rather than a design fact. Both halves are pinned in tests.
 *
 * The US API host was probed live on 2026-09-22
 * (`GET https://www.zohoapis.com/bigin/v2/Contacts` with no Authorization
 * header) and answered the documented error body
 * `{"code":"AUTHENTICATION_FAILURE","details":{},"message":"Authentication
 * failed","status":"error"}` — a real API, not a catch-all 200.
 *
 * Why a table rather than one constant: `w6w.network.allow` must list every
 * API host a connection can land on, and `lib/client.ts` resolves the host per
 * connection from the OAuth token response's `api_domain`. Keeping the eight
 * hosts in one place means the manifest allowlist, the default host and the
 * `api_domain` fallbacks cannot drift apart — `tests/index.test.ts` asserts
 * the allowlist against {@link API_HOSTS} rather than retyping it.
 */
export interface BiginRegion {
  /** Short key Zoho uses for the data centre (also the `location` callback value). */
  key: string;
  /** Human label. */
  label: string;
  /** OAuth authorization/token host for this data centre. */
  accountsHost: string;
  /** Bigin REST API host for this data centre. */
  apiHost: string;
}

export const REGIONS: BiginRegion[] = [
  {
    key: "us",
    label: "United States",
    accountsHost: "accounts.zoho.com",
    apiHost: "www.zohoapis.com",
  },
  {
    key: "au",
    label: "Australia",
    accountsHost: "accounts.zoho.com.au",
    apiHost: "www.zohoapis.com.au",
  },
  { key: "eu", label: "Europe", accountsHost: "accounts.zoho.eu", apiHost: "www.zohoapis.eu" },
  { key: "in", label: "India", accountsHost: "accounts.zoho.in", apiHost: "www.zohoapis.in" },
  {
    key: "cn",
    label: "China",
    accountsHost: "accounts.zoho.com.cn",
    apiHost: "www.zohoapis.com.cn",
  },
  { key: "jp", label: "Japan", accountsHost: "accounts.zoho.jp", apiHost: "www.zohoapis.jp" },
  {
    key: "sa",
    label: "Saudi Arabia",
    accountsHost: "accounts.zoho.sa",
    apiHost: "www.zohoapis.sa",
  },
  // The odd one out: `www.zohoapis.ca` (API) but `accounts.zohocloud.ca` (OAuth).
  { key: "ca", label: "Canada", accountsHost: "accounts.zohocloud.ca", apiHost: "www.zohoapis.ca" },
];

/** The US data centre — where every authorization request must start. */
export const US_REGION = REGIONS[0];

/** Every regional API host. Must equal the `www.zohoapis.*` half of `w6w.network.allow`. */
export const API_HOSTS = REGIONS.map((r) => r.apiHost);

/** Every regional OAuth host, Canada's `accounts.zohocloud.ca` included. */
export const ACCOUNTS_HOSTS = REGIONS.map((r) => r.accountsHost);

/**
 * The API host to address when a connection records no `api_domain` at all.
 * Zoho's token response always carries one for a successful exchange, so this
 * is a fallback for hand-made or older connections — the US host, exactly the
 * default the `zoho` (Zoho CRM) sibling uses.
 */
export const DEFAULT_API_DOMAIN = `https://${US_REGION.apiHost}`;

/** Trim the trailing slashes Zoho sometimes appends to `api_domain`. */
export function normalizeDomain(domain: string): string {
  return domain.replace(/\/+$/, "");
}
