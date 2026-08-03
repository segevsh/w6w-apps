/**
 * Docusign eSignature REST API v2.1.
 *
 * Every path, query parameter and body field used by this app was read off
 * Docusign's own machine-readable contract — `esignature.rest.swagger-v2.1.json`
 * in `github.com/docusign/OpenAPI-Specifications` (fetched 2026-08-03,
 * `info.version` = `v2.1`) — cross-checked against the narrative reference at
 * `developers.docusign.com/docs/esign-rest-api/reference/`. Nothing here is
 * inferred from a naming pattern.
 *
 * ## The base URL is per-account and discovered at runtime
 *
 * This is the single thing most integrations get wrong, so it is worth stating
 * plainly: **there is no one Docusign API host.** The swagger's nominal
 * `host: www.docusign.net` is a placeholder. A real call goes to
 *
 * ```
 * {base_uri}/restapi/v2.1/accounts/{accountId}/...
 * ```
 *
 * where `base_uri` AND `accountId` both come from the account the token was
 * issued for, and are discovered by calling the **authentication** server:
 *
 * ```
 * GET https://account.docusign.com/oauth/userinfo     (production)
 * GET https://account-d.docusign.com/oauth/userinfo   (developer / demo)
 * Authorization: Bearer {access_token}
 *
 * -> { "sub": "...", "email": "...", "accounts": [
 *        { "account_id": "a4ec…33aa", "is_default": false,
 *          "account_name": "Example Europe Ltd", "base_uri": "https://eu.docusign.net" },
 *        { "account_id": "a4ec…20e1", "is_default": true,
 *          "account_name": "Example Corporation", "base_uri": "https://na3.docusign.net" } ] }
 * ```
 *
 * A user may belong to several accounts, each pinned to a different region, so
 * a hardcoded host is wrong for most users and *silently* wrong for the rest —
 * requests to the wrong region answer with an authorization error rather than a
 * redirect. The live production host list (from the unauthenticated
 * `GET https://www.docusign.net/restapi/service_information`, checked
 * 2026-08-03) is `www`, `na2`, `na3`, `na4`, `eu`, `au`, `ca`, `jp1` — all
 * under `docusign.net` — and the developer environment is `demo.docusign.net`.
 * Docusign adds regions over time, which is exactly why this app resolves the
 * host instead of listing it.
 *
 * The auth method's `afterConnect` performs that discovery **once** and records
 * `baseUri` + `accountId` on the Connection's `display`. Actions read them from
 * there via {@link accountContext}; no action re-derives them. That is also what
 * Docusign asks for: the userinfo endpoint is itself rate limited per user id
 * and per integration key, and the docs say the response "should always be
 * cached, at least for your application's entire session".
 *
 * ## Demo versus production
 *
 * The two environments are separate systems with separate accounts, separate
 * credentials and separate hosts — `account-d.docusign.com` + `demo.docusign.net`
 * versus `account.docusign.com` + the regional production hosts. Because
 * `OAuth2Config.authorizationUrl` / `tokenUrl` are static strings in this spec,
 * the environment cannot be a connect-time form field: it has to be chosen
 * before the browser redirect happens. So this app ships **two auth methods**,
 * `oauth2` (production) and `oauth2-demo` (developer), and the user picks one
 * per Connection. `afterConnect` stamps `environment` onto `display` so the
 * README, the connection label and any future branching can tell them apart.
 *
 * ## `w6w.network.allow`
 *
 * `["*.docusign.net", "account.docusign.com", "account-d.docusign.com"]`.
 * The wildcard is the narrowest form that works for a host set the manifest
 * cannot enumerate (same shape as Zendesk's `*.zendesk.com` in this pack, and
 * unlike WordPress's `"*"`, which is only defensible because the endpoint there
 * is a user-supplied self-hosted URL). The two auth hosts are exact — they are
 * the only `.docusign.com` hosts any hook reaches.
 *
 * ## Errors
 *
 * Failures answer with a small, uniform JSON envelope — verified live against
 * `demo.docusign.net` on 2026-08-03:
 *
 * ```
 * GET /restapi/v2.1/accounts/123/envelopes?from_date=…  (bogus token)
 *   -> 401 {"errorCode":"AUTHORIZATION_INVALID_TOKEN",
 *           "message":"The access token provided is expired, revoked or malformed."}
 * ```
 *
 * `errorCode` + `message` is what this client surfaces.
 *
 * ## No auth header here
 *
 * The runtime routes every `ctx.fetch` through the auth `sign` hook, which is
 * the only code handed the credential. This client never sets one.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

/** Docusign's two independent environments. */
export type Environment = "production" | "demo";

/** The authentication service host per environment. Not an API host. */
export const AUTH_HOST: Record<Environment, string> = {
  production: "account.docusign.com",
  demo: "account-d.docusign.com",
};

/** `GET {auth host}/oauth/userinfo` — account discovery. */
export const USERINFO_PATH = "/oauth/userinfo";

/** `POST {auth host}/oauth/token` — code exchange and refresh. */
export const TOKEN_PATH = "/oauth/token";

/** `GET {auth host}/oauth/auth` — the browser authorization redirect. */
export const AUTHORIZE_PATH = "/oauth/auth";

/** Every eSignature path in this app hangs off `{base_uri}/restapi/v2.1`. */
export const API_PATH_PREFIX = "/restapi/v2.1";

/**
 * Docusign hosts every regional API endpoint under this apex, which is what
 * makes `*.docusign.net` a sound allowlist entry rather than a shrug.
 */
export const API_APEX = "docusign.net";

/** One entry of the `accounts` array returned by `/oauth/userinfo`. */
export interface AccountInfo {
  account_id?: string;
  account_name?: string;
  base_uri?: string;
  is_default?: boolean;
}

/** The `/oauth/userinfo` response. */
export interface UserInfo {
  sub?: string;
  name?: string;
  email?: string;
  accounts?: AccountInfo[];
}

/** The per-account routing facts an action needs, read off the Connection. */
export interface AccountContext {
  /** e.g. `https://na4.docusign.net` — no trailing slash. */
  baseUri: string;
  accountId: string;
}

/** The full userinfo URL for an environment. */
export function userInfoUrl(environment: Environment): string {
  return `https://${AUTH_HOST[environment]}${USERINFO_PATH}`;
}

/**
 * Pick the account this Connection should act on.
 *
 * `wanted` is the optional connect-time "Account ID" field. When it is blank
 * the default account wins, and when Docusign returns no default (which its own
 * docs call out as a rare but real error state) the first entry is used rather
 * than failing the connect outright. A `wanted` value that matches nothing is a
 * hard error listing what the token can actually reach — that is a typo the
 * user can fix, not something to paper over.
 */
export function selectAccount(info: UserInfo, wanted?: string): AccountInfo {
  const accounts = (info.accounts ?? []).filter((a) => a.account_id && a.base_uri);
  if (accounts.length === 0) {
    throw new Error(
      "Docusign returned no accounts for this login. Contact Docusign support — " +
        "their own docs describe a zero-account userinfo response as a records error.",
    );
  }
  const target = (wanted ?? "").trim();
  if (target) {
    const match = accounts.find((a) => a.account_id?.toLowerCase() === target.toLowerCase());
    if (!match) {
      const available = accounts
        .map((a) => `${a.account_name ?? "?"} (${a.account_id})`)
        .join(", ");
      throw new Error(
        `Account ID \`${target}\` is not one of the accounts this Docusign login can reach: ${available}`,
      );
    }
    return match;
  }
  return accounts.find((a) => a.is_default) ?? accounts[0];
}

/** Strip any trailing slash so `${baseUri}${path}` never doubles up. */
export function normalizeBaseUri(baseUri: string): string {
  return baseUri.replace(/\/+$/, "");
}

/**
 * Guard the discovered host against the app's egress allowlist.
 *
 * `w6w.network.allow` covers `*.docusign.net`. If Docusign ever hands back a
 * `base_uri` outside that apex — a government-cloud or otherwise special
 * deployment — the sandbox would deny the request with an opaque egress error.
 * Failing here instead says which host was refused and why, which is the
 * difference between a five-minute fix and an afternoon.
 */
export function assertAllowedHost(baseUri: string): void {
  let host: string;
  try {
    host = new URL(baseUri).hostname;
  } catch {
    throw new Error(`Docusign returned an unusable base_uri: ${baseUri}`);
  }
  if (!host.endsWith(`.${API_APEX}`)) {
    throw new Error(
      `Docusign base_uri \`${baseUri}\` is outside \`*.${API_APEX}\`, which is this app's ` +
        `egress allowlist. Widen \`w6w.network.allow\` in package.json to reach it.`,
    );
  }
}

/**
 * Read the routing facts `afterConnect` recorded. Actions call this rather than
 * asking Docusign again — see the module note on userinfo rate limits.
 */
export function accountContext(connection: RedactedConnection | undefined): AccountContext {
  const display = (connection?.display ?? {}) as { baseUri?: string; accountId?: string };
  const baseUri = display.baseUri;
  const accountId = display.accountId;
  if (!baseUri || !accountId) {
    throw new Error(
      "This Docusign connection has no baseUri/accountId recorded. Both are discovered from " +
        "`GET /oauth/userinfo` when the connection is made — reconnect to populate them.",
    );
  }
  assertAllowedHost(baseUri);
  return { baseUri: normalizeBaseUri(baseUri), accountId };
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** JSON request body. Omitted keys are never sent. */
  body?: unknown;
  /**
   * Return the raw `Response` instead of a parsed JSON body. Used by the one
   * endpoint that answers with `application/pdf` or `application/zip`.
   */
  raw?: boolean;
  /** Extra request headers (e.g. `accept` on the document download route). */
  headers?: Record<string, string>;
}

/** Docusign's error envelope. */
export interface DocusignError {
  errorCode?: string;
  message?: string;
}

/** Drop `undefined` / `null` / `""` so an unset optional param is never sent. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/**
 * Parse a JSON-object param. Rejects anything that is not an object so a typo
 * fails here with the param's name rather than as an opaque 400 from Docusign.
 */
export function jsonObject(raw: unknown, paramName: string): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") return {};
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

/** Parse a JSON-array param. Same reasoning as {@link jsonObject}. */
export function jsonArray(raw: unknown, paramName: string): unknown[] {
  if (raw === undefined || raw === null || raw === "") return [];
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON array.`);
  }
  return parsed;
}

/**
 * Thin wrapper over `ctx.fetch`, centralising the one thing this API makes
 * fiddly: composing `{base_uri}/restapi/v2.1/accounts/{accountId}` from the
 * Connection. Never sets an auth header — `sign` does that.
 */
export class DocusignClient {
  private readonly base: string;

  constructor(private ctx: HookContext) {
    const { baseUri, accountId } = accountContext(ctx.connection);
    this.base = `${baseUri}${API_PATH_PREFIX}/accounts/${accountId}`;
  }

  /** The composed account-scoped base, exposed for tests and log messages. */
  get accountBase(): string {
    return this.base;
  }

  /** Issue a request and return the parsed JSON body (or the raw `Response`). */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let parsed: DocusignError | undefined;
      if (text) {
        try {
          parsed = JSON.parse(text) as DocusignError;
        } catch {
          // Non-JSON error body (a gateway page, say) — fall back to the text.
        }
      }
      const label = [parsed?.errorCode, parsed?.message].filter(Boolean).join(": ") ||
        (text ? text.slice(0, 200) : res.statusText);
      throw new Error(`Docusign ${res.status} for ${method} ${url.pathname}: ${label}`);
    }

    if (options.raw) return res as unknown as T;

    if (res.status === 204) {
      await res.body?.cancel();
      return undefined as T;
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
