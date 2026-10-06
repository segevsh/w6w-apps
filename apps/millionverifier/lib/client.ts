import type { ActionDefinition, HookContext } from "@w6w/types";

/**
 * MillionVerifier API. Verified 2026-10-06 against the vendor's OpenAPI 3.0.0 document
 * embedded in `developer.millionverifier.com` (info.version 3.1.0) plus live probes of
 * both hosts.
 *
 * ## Two hosts, two names for the same key
 *
 * - Single API, `https://api.millionverifier.com`: `/api/v3/` (verify one address) and
 *   `/api/v3/credits`. The API key is the query parameter `api`.
 * - Bulk API, `https://bulkapi.millionverifier.com`: `/bulkapi/v2/upload`, `fileinfo`,
 *   `filelist`, `download`, `delete` and `/bulkapi/stop`. The API key is the query
 *   parameter `key`.
 *
 * The Auth `sign` hook adds whichever one the request's host calls for; nothing here sees
 * the key.
 *
 * ## Things that are not what they look like
 *
 * - Every error is HTTP 200. A wrong key, a missing key, a missing email, no credits and a
 *   file that does not exist all answer `200` with a JSON body carrying `error`
 *   (`apikey_not_found`, `No apikey specified`, `invalid_api_key`, `empty_api_key`,
 *   `insufficient_credits`, `file_not_found`, ...). The status code says nothing; the body
 *   is the verdict, so the client throws on a non-empty `error` string.
 * - The exception is a file record: it carries its own `error` (file-level problem) next
 *   to a `file_id`, and is data, not a failed request.
 * - The single API's error vocabulary differs from the bulk API's (`apikey_not_found` vs
 *   `invalid_api_key`).
 * - `download` answers a file (`application/octet-stream`) on success and JSON on failure.
 */
export const SINGLE_HOST = "api.millionverifier.com";
export const BULK_HOST = "bulkapi.millionverifier.com";

export type Api = "single" | "bulk";

type Scalar = string | number | boolean | undefined | null;

export function baseOf(api: Api): string {
  return `https://${api === "single" ? SINGLE_HOST : BULK_HOST}`;
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

export class MillionVerifierError extends Error {
  constructor(message: string, public httpStatus: number, public vendorCode?: string) {
    super(message);
    this.name = "MillionVerifierError";
  }
}

const HINTS: Record<string, string> = {
  apikey_not_found: "the API key was not recognised; copy it from app.millionverifier.com/api",
  invalid_api_key: "the API key was not recognised; copy it from app.millionverifier.com/api",
  empty_api_key: "no API key was sent; reconnect the app with a key",
  "No apikey specified": "no API key was sent; reconnect the app with a key",
  insufficient_credits: "not enough credits for this file; top up at app.millionverifier.com",
  file_not_found: "no file with that ID exists on this account",
};

/** True when a parsed body is the vendor's request-level error (not a file record). */
export function isVendorError(body: unknown): body is { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const b = body as { error?: unknown; file_id?: unknown };
  return typeof b.error === "string" && b.error !== "" && b.file_id === undefined;
}

export function formatError(method: string, path: string, body: unknown, status: number): string {
  const b = body as Record<string, unknown>;
  const code = String(b.error);
  const extra = [
    typeof b.unique_emails === "number" ? `${b.unique_emails} unique emails` : "",
    typeof b.credits === "number" ? `${b.credits} credits available` : "",
  ].filter(Boolean).join(", ");
  const hint = HINTS[code] ? ` — ${HINTS[code]}` : "";
  return truncate(
    `MillionVerifier ${method} ${path}: ${code}${extra ? ` (${extra})` : ""}${hint}` +
      (status === 200 ? "" : ` [HTTP ${status}]`),
    800,
  );
}

export interface RequestOptions {
  api: Api;
  method?: string;
  query?: Record<string, Scalar>;
  /** Raw body (the multipart upload). */
  body?: Uint8Array;
  contentType?: string;
}

export interface ApiResult {
  status: number;
  body: unknown;
  /** Raw response text. */
  text: string;
  contentType: string;
}

export class MillionVerifierClient {
  constructor(private ctx: HookContext) {}

  async request(path: string, options: RequestOptions): Promise<ApiResult> {
    const url = new URL(`${baseOf(options.api)}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const method = options.method ?? (options.body ? "POST" : "GET");
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body) {
      headers["content-type"] = options.contentType ?? "application/octet-stream";
      init.body = options.body.slice().buffer;
    }
    // No credential here: the Auth `sign` hook adds `api=` / `key=` by host.
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    const contentType = res.headers.get("content-type") ?? "";
    let body: unknown = text;
    if (/json/i.test(contentType) || /^\s*[{[]/.test(text)) {
      try {
        body = text ? JSON.parse(text) : undefined;
      } catch { /* not JSON */ }
    }
    if (isVendorError(body)) {
      throw new MillionVerifierError(
        formatError(method, url.pathname, body, res.status),
        res.status,
        body.error,
      );
    }
    if (!res.ok) {
      throw new MillionVerifierError(
        truncate(
          `MillionVerifier ${res.status} for ${method} ${url.pathname}: ${text.trim()}`,
          800,
        ),
        res.status,
      );
    }
    return { status: res.status, body, text, contentType };
  }
}

export function required(value: unknown, name: string): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`${name} is required`);
  return s;
}

/** Base64 (optionally a `data:...;base64,` URI) to raw bytes. */
export function base64ToBytes(input: string): Uint8Array {
  const cleaned = input.includes(",") ? input.split(",", 2)[1] : input;
  const bin = atob(cleaned.trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Split a newline / comma / semicolon / space separated list into trimmed items. */
export function splitList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value ?? "").split(/[\s,;]+/).map((v) => v.trim()).filter(Boolean);
}

export interface MultipartFile {
  field: string;
  filename: string;
  contentType: string;
  bytes: Uint8Array;
}

/** Build a `multipart/form-data` body by hand (a sandbox has no reliable FormData encoder). */
export function buildMultipart(
  files: MultipartFile[],
): { body: Uint8Array; contentType: string } {
  const boundary = `----w6wMillionVerifier${crypto.randomUUID().replaceAll("-", "")}`;
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const clean = (s: string) => s.replace(/["\r\n]/g, "_");
  for (const f of files) {
    parts.push(enc.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="${clean(f.field)}"; filename="${
        clean(f.filename)
      }"\r\nContent-Type: ${f.contentType.replace(/[\r\n]/g, "")}\r\n\r\n`,
    ));
    parts.push(f.bytes);
    parts.push(enc.encode("\r\n"));
  }
  parts.push(enc.encode(`--${boundary}--\r\n`));
  const body = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) {
    body.set(p, off);
    off += p.length;
  }
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

/** Map a bulk file record to camelCase. */
export function mapFile(raw: unknown): Record<string, unknown> {
  const f = (raw ?? {}) as Record<string, unknown>;
  return {
    fileId: f.file_id === undefined ? undefined : String(f.file_id),
    fileName: f.file_name,
    status: f.status,
    uniqueEmails: f.unique_emails,
    updatedAt: f.updated_at,
    createdAt: f.createdate,
    percent: f.percent,
    totalRows: f.total_rows,
    verified: f.verified,
    unverified: f.unverified,
    ok: f.ok,
    catchAll: f.catch_all,
    disposable: f.disposable,
    invalid: f.invalid,
    unknown: f.unknown,
    reverify: f.reverify,
    credit: f.credit,
    estimatedTimeSec: f.estimated_time_sec,
    error: f.error === "" ? undefined : f.error,
  };
}

/** The file-record output schema shared by the bulk actions. */
export const FILE_OUTPUT: NonNullable<ActionDefinition["output"]> = [
  { key: "fileId", type: "string", label: "File ID" },
  { key: "fileName", type: "string", label: "File name" },
  {
    key: "status",
    type: "string",
    label: "Status (in_progress, error, finished, canceled, paused, in_queue_to_start)",
  },
  { key: "uniqueEmails", type: "number", label: "Unique emails in the file" },
  { key: "percent", type: "number", label: "Progress percentage" },
  { key: "totalRows", type: "number", label: "Total rows" },
  { key: "verified", type: "number", label: "Verified" },
  { key: "unverified", type: "number", label: "Unverified" },
  { key: "ok", type: "number", label: "OK" },
  { key: "catchAll", type: "number", label: "Catch-all" },
  { key: "disposable", type: "number", label: "Disposable" },
  { key: "invalid", type: "number", label: "Invalid" },
  { key: "unknown", type: "number", label: "Unknown" },
  { key: "reverify", type: "number", label: "To re-verify" },
  { key: "credit", type: "number", label: "Credits needed" },
  { key: "estimatedTimeSec", type: "number", label: "Estimated seconds to finish" },
  { key: "createdAt", type: "string", label: "Created (yyyy-MM-dd HH:mm:ss)" },
  { key: "updatedAt", type: "string", label: "Last updated" },
  { key: "error", type: "string", label: "File-level error, if any" },
];
