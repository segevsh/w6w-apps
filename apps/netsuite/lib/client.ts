import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * NetSuite SuiteTalk REST Web Services client.
 *
 * Verified 2026-10-05 against Oracle's SuiteTalk REST Web Services guide ("REST Web Services URL
 * Schema and Account-Specific URLs", "Working with Records", "Record Filtering and Query",
 * "Executing SuiteQL Queries Through REST Web Services", "Collection Paging", "Error Handling").
 *
 * ## One host per account
 *
 * REST web services are only reachable on an account-specific domain,
 * `https://<account>.suitetalk.api.netsuite.com`, so the manifest declares the wildcard
 * `*.suitetalk.api.netsuite.com`. The account id is therefore validated strictly here: it becomes
 * a DNS label, and anything that is not `[a-z0-9]` runs separated by single hyphens is refused
 * before a request is built. Sandbox and release-preview ids (`1234567_SB1`) are written with an
 * underscore and upper case in NetSuite's UI but the hostname is lower-case with a hyphen
 * (`1234567-sb1`); {@link normaliseAccountId} does that mapping. The REST pages do not spell the
 * mapping out — it comes from NetSuite's account-specific-domain convention and from the
 * `Company URLs` subtab the guide points at — so a connection whose host is different should copy
 * the host from there.
 *
 * ## Shapes
 *
 * - Record service: `/services/rest/record/v1/<type>[/<id>|/eid:<externalId>]`. Create (POST),
 *   update (PATCH) and delete answer **204 with no body**; the new/updated record's URL is in the
 *   `Location` header.
 * - Query service: `POST /services/rest/query/v1/suiteql` with `Prefer: transient` (required),
 *   `{"q": "...", "params": [...]}`, paged by `limit` (max 1000) and `offset`.
 * - System service: `/services/rest/system/v1/{serverTime,governanceLimits}`.
 * - Errors: `{"title","status","o:errorDetails":[{"detail","o:errorCode",...}]}`.
 */

export const HOST_SUFFIX = ".suitetalk.api.netsuite.com";
export const REST = "/services/rest";

export class NetSuiteError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly path?: string,
  ) {
    super(message);
    this.name = "NetSuiteError";
  }
}

/** `1234567_SB1` / `TSTDRV123` -> the hostname label (`1234567-sb1` / `tstdrv123`). */
export function normaliseAccountId(raw: unknown): string {
  const id = String(raw ?? "").trim().toLowerCase().replace(/_/g, "-");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 60) {
    throw new Error(
      "Invalid NetSuite account id — use letters and digits, with `_` or `-` only between " +
        "them (for example `1234567` or `1234567_SB1`).",
    );
  }
  return id;
}

export function accountFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { accountId?: string };
  if (display.accountId) return normaliseAccountId(display.accountId);
  throw new Error(
    "NetSuite connection has no account id — reconnect the account so it can be recorded.",
  );
}

export function accountBase(accountId: string): string {
  return `https://${normaliseAccountId(accountId)}${HOST_SUFFIX}`;
}

/** True when `url` is an HTTPS request to a per-account SuiteTalk host. */
export function isSuiteTalkUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(HOST_SUFFIX) &&
      u.hostname.length > HOST_SUFFIX.length;
  } catch {
    return false;
  }
}

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Accept a `json` param as the parsed value or the string a user typed. */
export function parseJson(raw: unknown, what: string): unknown {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`\`${what}\` is not valid JSON.`);
  }
}

export function jsonObject(raw: unknown, what: string): Record<string, unknown> {
  const v = parseJson(raw, what);
  if (v === undefined) return {};
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new Error(`\`${what}\` must be a JSON object.`);
  }
  return v as Record<string, unknown>;
}

/** Record type script id: `customer`, `salesOrder`, `customrecord_x`. */
export function recordType(raw: unknown): string {
  const t = String(raw ?? "").trim();
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(t)) {
    throw new Error(
      "Invalid record type — use the REST record name (for example `customer`, `salesOrder`, " +
        "`customrecord_myrecord`).",
    );
  }
  return t;
}

/** An internal id, or `eid:<externalId>`. Each part is percent-encoded into the path. */
export function recordId(raw: unknown): string {
  const id = String(raw ?? "").trim();
  if (id === "") throw new Error("A record id is required.");
  if (/^eid:/i.test(id)) {
    const ext = id.slice(4);
    if (ext === "") throw new Error("An `eid:` id needs the external id after it.");
    return `eid:${encodeURIComponent(ext)}`;
  }
  return encodeURIComponent(id);
}

export function externalIdPath(externalId: unknown): string {
  const ext = String(externalId ?? "").trim();
  if (ext === "") throw new Error("An external id is required.");
  return `eid:${encodeURIComponent(ext)}`;
}

/** `/record/v1/<type>` or `/record/v1/<type>/<id>`. */
export function recordPath(type: unknown, id?: string): string {
  const base = `${REST}/record/v1/${recordType(type)}`;
  return id === undefined ? base : `${base}/${id}`;
}

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Percent-encode with `%20` (not `+`) so the wire form matches what a TBA signature covers. */
export function queryString(query: Query | undefined): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export interface RequestOptions {
  method?: string;
  query?: Query;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface NetSuiteResponse {
  status: number;
  /** Parsed JSON body, or `null` for an empty (204) body. */
  data: Record<string, unknown> | null;
  location: string | null;
}

/** The trailing path segment of a `Location` header — the record's id. */
export function idFromLocation(location: string | null): string | null {
  if (!location) return null;
  const path = location.split("?")[0].replace(/\/+$/, "");
  const last = path.slice(path.lastIndexOf("/") + 1);
  return last === "" ? null : decodeURIComponent(last);
}

/** Pull NetSuite's own error out of a response body, whatever the HTTP status. */
export function describeError(body: unknown): { message?: string; code?: string; path?: string } {
  if (typeof body !== "object" || body === null) return {};
  const b = body as Record<string, unknown>;
  const details = b["o:errorDetails"];
  if (Array.isArray(details) && details.length > 0) {
    const d = details[0] as Record<string, unknown>;
    return {
      message: typeof d.detail === "string" ? d.detail : undefined,
      code: typeof d["o:errorCode"] === "string" ? d["o:errorCode"] : undefined,
      path: typeof d["o:errorPath"] === "string" ? d["o:errorPath"] : undefined,
    };
  }
  return { message: typeof b.title === "string" ? b.title : undefined };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime routes every request
 * through the auth `sign` hook.
 */
export class NetSuiteClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = accountBase(accountFromConnection(ctx.connection));
  }

  async request(path: string, opts: RequestOptions = {}): Promise<NetSuiteResponse> {
    const method = (opts.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = { accept: "application/json", ...opts.headers };
    let body: string | undefined;
    if (opts.body !== undefined) {
      body = JSON.stringify(opts.body);
      headers["content-type"] = "application/json";
    }
    const res = await this.ctx.fetch(`${this.base}${path}${queryString(opts.query)}`, {
      method,
      headers,
      body,
    });
    const text = await res.text().catch(() => "");
    let data: Record<string, unknown> | null = null;
    if (text.trim() !== "") {
      try {
        data = JSON.parse(text);
      } catch {
        if (res.ok) throw new NetSuiteError("NetSuite returned a non-JSON body", res.status);
      }
    }
    if (!res.ok) {
      const e = describeError(data);
      throw new NetSuiteError(
        e.message ?? `NetSuite returned HTTP ${res.status}`,
        res.status,
        e.code,
        e.path,
      );
    }
    return { status: res.status, data, location: res.headers.get("location") };
  }
}

/** The fields every action surfaces from a write: the record's id and URL. */
export function writeResult(r: NetSuiteResponse): { id: string | null; location: string | null } {
  return { id: idFromLocation(r.location), location: r.location };
}
