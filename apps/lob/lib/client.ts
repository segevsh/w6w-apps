import type { HookContext } from "@w6w/types";

/**
 * Lob Print & Mail / Address Verification REST client.
 *
 * Verified on 2026-10-06 against Lob's own OpenAPI 3.0.3 document
 * (`github.com/lob/lob-openapi`, `dist/lob-api-bundled.yml`, `info.version` 1.22.0, the
 * source of Lob's published API reference) plus unauthenticated and bad-key probes against
 * `api.lob.com`.
 *
 * ## One host, one prefix, one credential
 *
 * The document declares exactly one server, `https://api.lob.com/v1`. Test and live are NOT
 * different hosts: the **key** decides. A `test_…` key runs against Lob's sandbox behaviour
 * (nothing is printed, mailed or billed; verification endpoints return canned results) and a
 * `live_…` key does the real thing, both against the same URL. Auth is HTTP Basic with the key
 * as the username and an empty password (`lib/../auth/api-key.ts`).
 *
 * ## Errors
 *
 * Every failure is `{"error": {"message", "status_code", "code"}}`. The `code` is the stable
 * machine key (`invalid_api_key`, `unauthorized`, `not_found`, `invalid`, `rate_limit_exceeded`,
 * `unrecognized_endpoint`, …) and is surfaced verbatim by {@link formatLobError}: a missing
 * credential and a wrong key are both HTTP 401 and differ only by `code`.
 *
 * ## Lists
 *
 * Every list answers `{object, next_url, previous_url, count, total_count?, data}`. Paging is
 * cursor-based: `next_url` carries an opaque `after` token (and `previous_url` a `before`).
 * `limit` is 1..100, default 10. `total_count` is only present when asked for with
 * `include[]=total_count`. {@link LobClient.list} flattens that into
 * `{items, count, totalCount, nextCursor, previousCursor}`.
 *
 * ## Rate limits
 *
 * 150 requests per 5 seconds per key per endpoint (300 for `POST /us_verifications` and
 * `POST /us_autocompletions`); a refused call is HTTP 429 with code `rate_limit_exceeded`.
 */

export const API_BASE = "https://api.lob.com";
export const API_PREFIX = "/v1";

export interface RequestOptions {
  method?: string;
  /** Query parameters; undefined/null/"" are dropped, objects and arrays use bracket form. */
  query?: Record<string, unknown>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Sent as the `Idempotency-Key` header (Lob documents header or `idempotency_key` query). */
  idempotencyKey?: string;
  headers?: Record<string, string>;
}

export interface LobListResult {
  items: unknown[];
  count: number;
  totalCount?: number;
  nextCursor: string | null;
  previousCursor: string | null;
}

interface LobErrorBody {
  error?: { message?: string; status_code?: number; code?: string };
}

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Path-escape a caller-supplied resource id. */
export function encodeId(id: unknown): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 * Returns undefined for absent input.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * A recipient/sender: either the id of a saved address (`adr_…`) or an inline address object.
 *
 * A string that starts with `{` is parsed as JSON; any other string is passed through as the
 * address id, so a plain `adr_123` typed into a text field works.
 */
export function asAddress(value: unknown, label: string): string | Record<string, unknown> {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required`);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{")) {
      return asOptionalJson<Record<string, unknown>>(trimmed, label)!;
    }
    return trimmed;
  }
  return value as Record<string, unknown>;
}

/** A string-or-object param that is optional (a `from` on a postcard, a `bank_account` id…). */
export function asOptionalAddress(
  value: unknown,
  label: string,
): string | Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return asAddress(value, label);
}

/** Pull the `after`/`before` cursor out of a Lob `next_url` / `previous_url`. */
export function cursorFromUrl(url: unknown, name: "after" | "before"): string | null {
  if (typeof url !== "string" || !url) return null;
  try {
    return new URL(url).searchParams.get(name);
  } catch {
    return null;
  }
}

/**
 * Turn Lob's error body into one actionable line, keeping the machine `code`.
 *
 * The credential never enters this module; the message carries only Lob's own prose.
 */
export function formatLobError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: LobErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as LobErrorBody;
  } catch { /* not JSON — fall through */ }

  const err = parsed?.error;
  if (!err) return `Lob ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Lob ${status} ${err.code ?? "error"} for ${method} ${path}`,
    err.message,
    status === 429
      ? "Lob allows 150 requests per 5 seconds per key per endpoint (300 for US verification " +
        "and autocomplete); wait and retry"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

/**
 * Serialize a query object. Nested objects use Lob's bracket form (`date_created[gt]=…`,
 * `metadata[campaign]=…`), arrays use `key[]=value` repeated.
 */
export function buildQuery(query: Record<string, unknown> | undefined): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) sp.append(`${k}[]`, String(item));
    } else if (typeof v === "object") {
      for (const [sub, subValue] of Object.entries(v as Record<string, unknown>)) {
        if (subValue === undefined || subValue === null || subValue === "") continue;
        sp.append(`${k}[${sub}]`, String(subValue));
      }
    } else {
      sp.append(k, String(v));
    }
  }
  return sp;
}

export class LobClient {
  constructor(private ctx: HookContext) {}

  /** Parse a JSON response (or `undefined` for an empty body). */
  async json<T = Record<string, unknown>>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    const method = options.method ?? "GET";
    for (const [k, v] of buildQuery(options.query)) url.searchParams.append(k, v);

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(formatLobError(res.status, method, url.pathname, text));
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** A cursor-paginated list, flattened. */
  async list(
    path: string,
    query: Record<string, unknown> = {},
    opts: { includeTotal?: boolean } = {},
  ): Promise<LobListResult> {
    const body = await this.json<{
      data?: unknown[];
      count?: number;
      total_count?: number;
      next_url?: string | null;
      previous_url?: string | null;
    }>(path, {
      query: { ...query, include: opts.includeTotal ? ["total_count"] : undefined },
    });
    const items = body?.data ?? [];
    const result: LobListResult = {
      items,
      count: body?.count ?? items.length,
      nextCursor: cursorFromUrl(body?.next_url, "after"),
      previousCursor: cursorFromUrl(body?.previous_url, "before"),
    };
    if (typeof body?.total_count === "number") result.totalCount = body.total_count;
    return result;
  }
}

/**
 * Delete `account_number` from a bank-account entity, returning a shallow copy.
 *
 * Lob's bank-account schema requires `account_number` in every response, so a plain read of
 * `GET /bank_accounts` hands back the full account number of the account checks are drawn on.
 * A workflow step's result is persisted in the run record and echoed into logs and other apps,
 * so this is dropped before an action returns. The routing number is public information and is
 * kept; the account number stays visible to its owner in the Lob Dashboard.
 */
export function stripBankSecrets<T>(entity: T): T {
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) return entity;
  const out: Record<string, unknown> = { ...(entity as Record<string, unknown>) };
  delete out.account_number;
  return out as T;
}
