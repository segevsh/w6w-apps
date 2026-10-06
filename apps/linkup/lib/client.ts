import type { HookContext } from "@w6w/types";

/**
 * Linkup API. Verified 2026-10-06 against `https://api.linkup.so/v1/openapi.json` (OpenAPI
 * 3.1, server `https://api.linkup.so`, one security scheme: HTTP bearer), the docs index at
 * `docs.linkup.so/llms.txt` and live unauthenticated probes of the API host.
 *
 * ## Errors
 *
 * Every error carries one JSON shape whatever the status (docs: "Errors"):
 * `{"statusCode": 401, "error": {"code": "UNAUTHORIZED", "message": "...", "details": [{"field",
 * "message"}]}}`. The status is a hint, the `error.code` is the answer. A `429` means EITHER
 * "out of credit" OR "more than 10 queries per second per organisation", and the body does not
 * say which.
 */
export const API_BASE = "https://api.linkup.so";
export const API_HOST = "api.linkup.so";
export const STATUS_HOST = "status.linkup.so";

type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Array values are sent as repeated keys (`type=search&type=fetch`), which is how the spec's `explode: true` reads. */
  query?: Record<string, Scalar | Scalar[]>;
  body?: unknown;
}

export function truncate(text: string, max = 800): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

export function encodeId(id: unknown): string {
  const v = String(id ?? "").trim();
  if (!v) throw new Error("id is required");
  return encodeURIComponent(v);
}

/** Drop `undefined`/`null`/empty-string members so the wire carries only what was set. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export interface LinkupErrorBody {
  statusCode?: number;
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field?: string; message?: string }>;
  };
}

/** The vendor's error code (`UNAUTHORIZED`, `VALIDATION_ERROR`, …) from a raw error body, if any. */
export function errorCode(raw: string): string | undefined {
  try {
    const code = (JSON.parse(raw) as LinkupErrorBody)?.error?.code;
    return typeof code === "string" ? code : undefined;
  } catch {
    return undefined;
  }
}

export function errorText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const e = (JSON.parse(trimmed) as LinkupErrorBody)?.error;
    if (e && typeof e === "object") {
      const fields = (e.details ?? [])
        .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
        .filter(Boolean)
        .join("; ");
      return [e.code, e.message, fields && `(${fields})`].filter(Boolean).join(" ");
    }
  } catch { /* not JSON */ }
  return trimmed;
}

export function formatError(status: number, method: string, path: string, raw: string): string {
  const hint = status === 401
    ? " — the API key is missing or invalid; reconnect this connection"
    : status === 402
    ? " — no API key reached the request (Linkup answers 402 x402 payment details instead of 401 on search and fetch)"
    : status === 403
    ? " — the key may not use this resource (beta endpoints are enabled per organisation)"
    : status === 429
    ? " — out of credits, or over 10 queries per second; retry with backoff or top up"
    : status === 504
    ? " — Linkup's request deadline was exceeded; retry, or use a lower depth"
    : "";
  return truncate(`Linkup ${status} for ${method} ${path}: ${errorText(raw)}${hint}`, 1000);
}

export class LinkupClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const method = (opts.method ?? "GET").toUpperCase();
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      for (const item of Array.isArray(v) ? v : [v]) {
        if (item !== undefined && item !== null && item !== "") {
          url.searchParams.append(k, String(item));
        }
      }
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    const raw = await res.text();
    if (!res.ok) throw new Error(formatError(res.status, method, path, raw));
    if (!raw.trim()) return undefined as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error(`Linkup ${method} ${path} answered 200 with a body that is not JSON`);
    }
  }

  get<T = unknown>(path: string, query?: RequestOptions["query"]): Promise<T> {
    return this.request<T>(path, { query });
  }

  post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }
}
