import type { HookContext, RedactedConnection } from "@w6w/types";
import { REGIONS } from "./regions.ts";

/**
 * Zoho Cliq REST API v2 client.
 *
 * Every path, verb, body field and response shape in this app was verified on
 * 2026-10-06 against Zoho's own reference
 * (`https://www.zoho.com/cliq/help/restapi/v2/`) plus live unauthenticated
 * probes of all nine regional hosts (see `lib/regions.ts`).
 *
 * What bites:
 *
 *  1. **Host is `cliq.zoho.<tld>`, path prefix `/api/v2`.** Orgs on a Cliq
 *     *network* (external-collaboration space) use `/network/{name}/api/v2`
 *     instead; this app targets the organization root only.
 *  2. **Bodies are JSON** (`content-type: application/json`) except file
 *     shares, which are multipart.
 *  3. **Most mutations answer `204 No Content` with an EMPTY body** — channel
 *     member add/remove, join/leave, message edit/delete, file shares. The
 *     client returns `undefined` for an empty body and actions turn that into
 *     `{ success: true }`.
 *  4. **The response envelope is not uniform.** Lists wrap under a
 *     resource-specific key (`channels`, `chats`, `teams`, `members`,
 *     `list`) or under `data` (`users`, `messages`). Single records are
 *     sometimes bare and sometimes under `data`; `unwrapData` accepts both.
 *  5. **Errors are `{"code": "<snake_case>", "message": "..."}`** — and a
 *     request with NO Authorization header is answered `401` with a two-byte
 *     blank `text/html` body, not JSON. A dead token gets
 *     `{"code":"oauthtoken_invalid","message":"Invalid OAuth token passed."}`
 *     (both confirmed live).
 *  6. **Message ids may carry a space** (`1645632094118 223997917594` in the
 *     reactions examples, `%20` in URLs); always `encodeURIComponent` them.
 */

/** Every documented endpoint hangs off this path prefix. */
export const API_PREFIX = "/api/v2";

/** The default (United States) API host, used only where no connection/region is known yet. */
export const DEFAULT_API_HOST = REGIONS.find((r) => r.key === "us")!.apiHost;

/**
 * The API host for this connection, as recorded by `auth/oauth2.ts`'s
 * `afterConnect` (one fixed host per region-specific auth method).
 */
export function apiHostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiHost?: string };
  return display.apiHost || DEFAULT_API_HOST;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Set instead of `body` for a multipart upload (file shares). */
  form?: FormData;
}

interface CliqErrorBody {
  code?: string;
  message?: string;
}

/**
 * Turn a Cliq error response into one actionable line. `code` is the stable
 * machine token (`oauthtoken_invalid`, ...); an unauthenticated call has no
 * JSON body at all, so fall back to the status.
 */
export function formatCliqError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: CliqErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as CliqErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message && !parsed?.code) {
    const trimmed = raw.trim();
    const shown = trimmed.length > 600
      ? `${trimmed.slice(0, 600)}… (${trimmed.length} bytes truncated)`
      : trimmed;
    return `Zoho Cliq ${status} for ${method} ${path}${shown ? `: ${shown}` : ""}`;
  }
  return `Zoho Cliq ${status}${parsed.code ? ` (${parsed.code})` : ""} for ${method} ${path}${
    parsed.message ? `: ${parsed.message}` : ""
  }`;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook, which stamps
 * `Zoho-oauthtoken`.
 */
export class ZohoCliqClient {
  private host: string;

  constructor(private ctx: HookContext) {
    this.host = apiHostFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`https://${this.host}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.form !== undefined) {
      init.body = options.form;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatCliqError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text.trim()) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Zoho Cliq ${res.status} for ${init.method} ${url.pathname}: expected JSON, got ${
          text.slice(0, 200)
        }`,
      );
    }
  }
}

/** URL-encode one path segment (ids, unique names, email addresses). */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value).trim());
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** A single record is sometimes bare and sometimes under `data` — accept both. */
export function unwrapData<T = Record<string, unknown>>(body: unknown): T {
  if (body && typeof body === "object" && "data" in (body as Record<string, unknown>)) {
    return (body as { data: T }).data;
  }
  return (body ?? {}) as T;
}

/** Split a comma/newline separated string (or pass an array through) into trimmed items. */
export function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Decode a base64 (optionally `data:` URL prefixed) string into bytes. */
export function base64ToBytes(base64: string): ArrayBuffer {
  const cleaned = base64.includes(",") ? base64.split(",", 2)[1] : base64;
  const bin = atob(cleaned.trim());
  const buffer = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buffer;
}

/** The success shape every `204 No Content` mutation reports. */
export interface Success {
  success: true;
}
export const SUCCESS: Success = { success: true };

export interface PostResult {
  success: true;
  /** Present only when `syncMessage` was set (and, for channels, not posted as a bot). */
  messageId?: string;
  /** The raw vendor response (empty when the post answered `204`). */
  response: unknown;
}

/** Normalise a "post message" response — `204` (empty) or `{ message_id }`. */
export function postResult(body: unknown): PostResult {
  const id = (body as { message_id?: string } | undefined)?.message_id;
  return { success: true, messageId: id, response: body ?? null };
}

export const postOutput = [
  { key: "success", type: "boolean", label: "Posted" },
  { key: "messageId", type: "string", label: "Message ID (with Return message ID)" },
  { key: "response", type: "object", label: "Vendor response" },
] as const;
