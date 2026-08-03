import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * # Quickbase's addressing model — and why this app's egress allowlist is NARROW
 *
 * Quickbase looks like a per-tenant-host vendor and is not one. Every customer
 * has a **realm** addressed as `acme.quickbase.com`, which is where the *web
 * UI* lives — but the JSON RESTful API does **not** live there. It lives on one
 * fixed host, and the realm rides along as a request **header**:
 *
 * ```
 * POST https://api.quickbase.com/v1/records/query
 * QB-Realm-Hostname: acme.quickbase.com
 * Authorization: QB-USER-TOKEN b1234567_abc_...
 * ```
 *
 * That is the whole reason `w6w.network.allow` here is two exact hosts rather
 * than the `*.quickbase.com` wildcard that Zendesk and Chargebee need. The app
 * never dials a customer's realm, so it must never be *allowed* to: a wildcard
 * would authorise a signed request to any subdomain of quickbase.com, which is
 * a strictly larger blast radius bought for nothing.
 *
 * Verified 2026-08-03 against Quickbase's own Swagger 2.0 document, which the
 * developer portal (developer.quickbase.com) ships inside its client bundle:
 *
 * ```json
 * { "swagger": "2.0", "info": { "title": "Quick Base API", "version": "1.0.0" },
 *   "host": "api.quickbase.com/v1", "basePath": "/", "schemes": ["https"] }
 * ```
 *
 * and every operation in it declares `QB-Realm-Hostname` as a REQUIRED header
 * parameter (`"example": "demo.quickbase.com"`).
 *
 * ## The EU host, and the one inference this file makes
 *
 * `api.quickbase.eu` is the second entry on the allowlist. Two pieces of
 * evidence, neither of them from memory:
 *
 *   1. The portal's own loader (`developer.quickbase.com/js/bootstrap.js`)
 *      treats exactly two suffixes as production realms —
 *      `hostname.endsWith(".quickbase.com") || hostname.endsWith(".quickbase.eu")`
 *      — and the docs bundle lists `https://api.quickbase.eu/` alongside
 *      `https://api.quickbase.com/` as a request host.
 *   2. On the wire (2026-08-03), `GET https://api.quickbase.eu/v1/apps/{id}`
 *      with only a realm header answers **byte-identically** to the US host:
 *      `400 application/json {"message":"Bad Request","description":"Required
 *      header 'authorization' not found"}`. That is the v1 API's own error
 *      envelope, not a parked host or a CDN default.
 *
 * What is NOT verified — stated plainly rather than papered over — is that an
 * EU realm is *required* to use `api.quickbase.eu`; testing that needs an EU
 * tenant's credential, which no amount of unauthenticated probing substitutes
 * for. The Swagger document declares only `api.quickbase.com`. So
 * {@link apiBase} derives the host from the realm's suffix, which is the
 * least-surprising rule available: `.quickbase.eu` realms go to the EU host,
 * everything else to the documented US host.
 */
const API_HOST_US = "api.quickbase.com";
const API_HOST_EU = "api.quickbase.eu";

/** The API version segment. Part of `host` in Quickbase's Swagger, not `basePath`. */
const API_VERSION = "v1";

/**
 * Pick the API host from the realm hostname. See the note above for the
 * evidence behind the EU branch and the limits of it.
 *
 * The realm is matched on its suffix rather than parsed, because a realm may
 * carry a subdomain of its own (`acme.quickbase.com`) and Quickbase also runs
 * non-production suffixes (`quickbaserocks.com`, `quickbase.org`) that this app
 * deliberately does not reach — they are not on the manifest allowlist, so an
 * unrecognised suffix falls through to the documented US host rather than
 * inventing a fourth one.
 */
export function apiBase(realm: string | undefined): string {
  const host = realm?.toLowerCase().endsWith(".quickbase.eu") ? API_HOST_EU : API_HOST_US;
  return `https://${host}/${API_VERSION}`;
}

/**
 * Connection `display` data this app publishes in `afterConnect`.
 *
 * None of it is credential material: a realm is a public hostname and an app id
 * is an opaque public identifier that appears in Quickbase URLs. The user token
 * is the only secret and it never leaves the `sign` hook.
 */
export interface QuickbaseDisplay {
  realm?: string;
  appId?: string;
  app?: { id?: string; name?: string };
}

function display(connection: RedactedConnection | undefined): QuickbaseDisplay {
  return (connection?.display ?? {}) as QuickbaseDisplay;
}

/**
 * The realm recorded on the Connection, used only to choose between the US and
 * EU API hosts.
 *
 * It is NOT used to build the `QB-Realm-Hostname` header — that comes from the
 * credential, inside `sign`, which is the only place allowed to read it. If the
 * display data is missing (an old Connection, say), the header is still correct
 * because `sign` still runs; only the host choice degrades, and it degrades to
 * the documented default rather than to an error.
 */
export function realmFromConnection(
  connection: RedactedConnection | undefined,
): string | undefined {
  return display(connection).realm;
}

/**
 * Resolve the Quickbase application id for a call: the Action's own `appId`
 * param when given, otherwise the Connection's default.
 *
 * Quickbase user tokens are assigned to specific applications, so an app id is
 * a property of the connection far more often than of the call — but a single
 * token can be assigned to several apps, so every Action that needs one also
 * accepts an override.
 */
export function resolveAppId(
  override: string | undefined,
  connection: RedactedConnection | undefined,
): string {
  const appId = (override ?? "").trim() || display(connection).appId;
  if (!appId) {
    throw new Error(
      "No Quickbase application id — pass `appId` on the action or reconnect the account " +
        "so the connection records a default.",
    );
  }
  return appId;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Metadata block returned by the paginating read endpoints
 * (`/records/query`, `/reports/{id}/run`). Quickbase calls this "intelligent
 * pagination": it decides `top` itself based on payload size unless you pin it,
 * so `numRecords < totalRecords` is normal and means "call again with a larger
 * `skip`", not "that was everything".
 */
export interface QuickbaseQueryMetadata {
  skip?: number;
  top?: number;
  numFields?: number;
  numRecords?: number;
  totalRecords?: number;
}

/** Field descriptor echoed alongside record data by the query/report endpoints. */
export interface QuickbaseFieldRef {
  id?: number;
  label?: string;
  type?: string;
  labelOverride?: string;
}

/**
 * A record as Quickbase returns it: keyed by **field id**, each value wrapped in
 * `{ value }`. Not by field label — `{"6": {"value": "Acme"}}`, not
 * `{"Name": "Acme"}`. The `fields` array in the same response is what maps ids
 * back to labels.
 */
export type QuickbaseRecord = Record<string, { value: unknown }>;

export interface QuickbaseRecordSet {
  data?: QuickbaseRecord[];
  fields?: QuickbaseFieldRef[];
  metadata?: QuickbaseQueryMetadata;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * It never sets `Authorization` or `QB-Realm-Hostname`: both are injected by
 * the auth `sign` hook, which is the only hook that may read the credential.
 * An Action that set them itself would have to hold the token, which is exactly
 * what the sandbox rules forbid.
 */
export class QuickbaseClient {
  private readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = apiBase(realmFromConnection(ctx.connection));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}/${stripLeadingSlash(path)}`);
    if (options.query) applyQuery(url, options.query);

    const method = options.method ?? "GET";
    const init: RequestInit = { method, headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) throw await requestError(res, method, url);
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

/**
 * Quickbase errors are JSON — `{"message":"Bad Request","description":"…"}` —
 * and the description is the useful half. It is echoed verbatim because it
 * describes the *request*, never the credential: the token is not on the
 * response and is not interpolated into this message.
 *
 * `qb-api-ray` is Quickbase's per-call correlation id. Including it turns a
 * support conversation from "sometime last Tuesday" into one identifier.
 */
async function requestError(res: Response, method: string, url: URL): Promise<Error> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const body = JSON.parse(text) as { message?: string; description?: string };
      detail = [body.message, body.description].filter(Boolean).join(": ") || text;
    } catch {
      detail = text;
    }
  } catch { /* body already consumed or unreadable — status alone will do */ }

  const ray = res.headers.get("qb-api-ray");
  return new Error(
    `Quickbase ${res.status} ${res.statusText} for ${method} ${url.pathname}` +
      `${ray ? ` [ray ${ray}]` : ""}${detail ? `: ${detail}` : ""}`,
  );
}

function stripLeadingSlash(p: string): string {
  return p.startsWith("/") ? p.slice(1) : p;
}

/** Skip unset params so an optional filter never becomes a literal "undefined". */
function applyQuery(
  url: URL,
  query: Record<string, string | number | boolean | undefined | null>,
): void {
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
}

/** Drop unset keys so a partial update doesn't blank out untouched properties. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept a JSON param either already parsed (the editor hands objects through)
 * or as the string a human typed into the form.
 */
export function parseJson<T>(raw: unknown, label: string): T {
  if (raw === undefined || raw === null || raw === "") {
    throw new Error(`${label} is required.`);
  }
  if (typeof raw !== "string") return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    throw new Error(`${label} is not valid JSON: ${(e as Error).message}`);
  }
}

/** Same as {@link parseJson}, but an empty value is simply absent. */
export function parseJsonOptional<T>(raw: unknown, label: string): T | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  return parseJson<T>(raw, label);
}
