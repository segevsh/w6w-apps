import type { HookContext } from "@w6w/types";

/**
 * Clearout API. Verified 2026-10-06 against the vendor's embedded OpenAPI 3.0.2
 * documents (`docs.clearout.io/developers/api/*.md`, `servers: https://api.clearout.io/v2`)
 * plus live unauthenticated probes of `api.clearout.io`.
 *
 * ## One host, one credential, one envelope
 *
 * Every call goes to `https://api.clearout.io/v2`. The API token is sent as
 * `Authorization: Bearer <token>` by the Auth `sign` hook; nothing here sees it.
 * Every response is an envelope: `{ status: "success", data }` or
 * `{ status: "failed", error: { code, message, … } }`. The client unwraps `data` and
 * throws on `status: "failed"` even when the HTTP status is 2xx (the vendor's schemas
 * list the error shape under 200 for several endpoints).
 *
 * ## Things that are not what they look like
 *
 * - Auth is checked BEFORE routing and validation: a missing token, a wrong token and a
 *   path that does not exist all answer `401 {"error":{"code":1000,…}}`. A 401 therefore
 *   proves nothing about the path being real.
 * - `524` on the instant Email Finder carries `error.additional_info.queue_id` when the
 *   search keeps running in the background; that id is read with the queue-status action.
 * - Credits are spent per call; 402 / code 1002 / 1028 mean none (enough) are left.
 */
export const API_HOST = "api.clearout.io";
export const API_BASE = `https://${API_HOST}/v2`;

type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, Scalar>;
  body?: unknown;
  /** Multipart upload (bulk list files). */
  form?: FormData;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

interface VendorError {
  code?: number;
  message?: string;
  reasons?: Array<{ field?: unknown[]; messages?: unknown[] }>;
  additional_info?: Record<string, unknown>;
}

/** The vendor's `error` object out of a JSON body, when there is one. */
export function vendorError(raw: unknown): VendorError | undefined {
  if (raw && typeof raw === "object") {
    const err = (raw as { error?: unknown }).error;
    if (err && typeof err === "object") return err as VendorError;
  }
  return undefined;
}

export function formatError(
  status: number,
  method: string,
  path: string,
  body: unknown,
  raw: string,
): string {
  const err = vendorError(body);
  const reasons = (err?.reasons ?? [])
    .map((r) => `${(r.field ?? []).join(".")}: ${(r.messages ?? []).join(", ")}`)
    .join("; ");
  const text = err?.message ?? raw.trim();
  const code = err?.code !== undefined ? ` [code ${err.code}]` : "";
  const hint = status === 401 || err?.code === 1000
    ? " — the API token was rejected; generate a new one in the Clearout developer dashboard"
    : status === 402 || err?.code === 1002 || err?.code === 1028 || err?.code === 1031
    ? " — no (or not enough) credits left on the account"
    : status === 429 || err?.code === 1030
    ? " — rate limit reached; wait for x-ratelimit-reset seconds and retry"
    : status === 524
    ? " — the verification timed out"
    : "";
  return truncate(
    `Clearout ${status}${code} for ${method} ${path}: ${text}${
      reasons ? ` (${reasons})` : ""
    }${hint}`,
    1000,
  );
}

export interface ApiResult {
  status: number;
  /** The envelope's `data` member (or the whole body when there is no envelope). */
  data: unknown;
  /** Parsed JSON body, or the raw text. */
  body: unknown;
}

export class ClearoutError extends Error {
  constructor(message: string, public httpStatus: number, public details?: VendorError) {
    super(message);
    this.name = "ClearoutError";
  }
}

export class ClearoutClient {
  constructor(private ctx: HookContext) {}

  async request(path: string, options: RequestOptions = {}): Promise<ApiResult> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const hasBody = options.body !== undefined || options.form !== undefined;
    const method = options.method ?? (hasBody ? "POST" : "GET");
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.form) {
      // fetch sets the multipart boundary itself.
      init.body = options.form;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    // No credential here: the Auth `sign` hook adds the bearer header.
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch { /* non-JSON */ }

    const failed = body !== null && typeof body === "object" &&
      (body as { status?: unknown }).status === "failed";
    if (!res.ok || failed) {
      throw new ClearoutError(
        formatError(res.status, method, url.pathname, body, typeof body === "string" ? body : ""),
        res.status,
        vendorError(body),
      );
    }
    const envelope = body as { data?: unknown } | undefined;
    const data = envelope && typeof envelope === "object" && "data" in envelope
      ? envelope.data
      : body;
    return { status: res.status, data, body };
  }
}

/** Drop `undefined`/`null`/empty-string members. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/** Split a newline / comma / semicolon separated list into trimmed, non-empty items. */
export function splitList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value ?? "").split(/[\s,;]+/).map((v) => v.trim()).filter(Boolean);
}
