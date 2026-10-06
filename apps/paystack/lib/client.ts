import type { HookContext } from "@w6w/types";

/**
 * Paystack REST client.
 *
 * Verified 2026-10-06 against the vendor's own OpenAPI 3.0.1 document
 * (`github.com/PaystackOSS/openapi`, `dist/paystack.yaml`) and unauthenticated probes
 * of `api.paystack.co`.
 *
 * ## Shapes worth knowing
 *
 *  - One host, no version prefix: `https://api.paystack.co/<resource>`.
 *  - Auth is `Authorization: Bearer sk_…` (injected by `sign`, never here).
 *  - Every response is an envelope `{status: boolean, message, data, meta?}`. A failure is
 *    `{status:false, message, type, code}` — measured: a bad key answers 401
 *    `{"status":false,"message":"Invalid key","type":"validation_error","code":"invalid_Key"}`.
 *    `code` is only ever one of `validation_error | processor_error | api_error` plus the
 *    odd specific value such as `invalid_Key`, so `message` carries the real detail.
 *  - **Amounts are integers in the currency's smallest unit** (kobo, pesewas, cents).
 *  - Lists are `{data: [...], meta: {total, skipped, perPage, page, pageCount}}`. The page-size
 *    query is spelled `perPage` in most of the OpenAPI document but `per_page` for transactions,
 *    transfers and transfer recipients; the vendor's reference pages use `perPage` throughout.
 *    Where the document says `per_page` this client sends both (an unknown query key is ignored).
 *  - Cursor pagination (`use_cursor=true`, then `next`/`previous`) exists on a few lists.
 */
export const API_BASE = "https://api.paystack.co";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export interface Envelope<T = unknown> {
  status?: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

interface PaystackErrorBody {
  status?: boolean;
  message?: string;
  type?: string;
  code?: string;
  meta?: { nextStep?: string };
  data?: { errors?: unknown };
}

/** Drop keys the caller left unset; `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a comma string or array into a clean list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Path-escape a caller-supplied id/code/reference so `/` or `?` cannot leave the segment. */
export function encodeId(id: unknown): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Require a non-empty string input, naming the field in the error. */
export function required(value: unknown, label: string): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`${label} is required`);
  return s;
}

/** Require a positive integer amount in the currency's smallest unit. */
export function requireAmount(value: unknown, label = "Amount"): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${label} must be a positive whole number in the currency's smallest unit`);
  }
  return n;
}

/**
 * Format a Paystack failure into one line. The vendor's `message` is the stable human detail;
 * `code`/`type` are kept when present, and `meta.nextStep` is the vendor's own advice.
 */
export function formatPaystackError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: PaystackErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as PaystackErrorBody;
  } catch { /* not JSON */ }
  if (!parsed || typeof parsed.message !== "string") {
    return `Paystack ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  const tags = [parsed.type, parsed.code].filter(Boolean).join("/");
  const next = parsed.meta?.nextStep ? ` — ${parsed.meta.nextStep}` : "";
  const hint = status === 429 ? " — rate limited; retry with backoff" : "";
  return truncate(
    `Paystack ${status} for ${method} ${path}: ${parsed.message}${
      tags ? ` (${tags})` : ""
    }${next}${hint}`,
    1000,
  );
}

/**
 * Standard list query. `perPage` goes out under both spellings (see the file header);
 * `page` is 1-based.
 */
export function pageQuery(input: {
  perPage?: number;
  page?: number;
  from?: string;
  to?: string;
}): Record<string, QueryValue> {
  return {
    perPage: input.perPage,
    per_page: input.perPage,
    page: input.page,
    from: input.from,
    to: input.to,
  };
}

export class PaystackClient {
  constructor(private ctx: HookContext) {}

  /** Call the API and return the raw envelope. Throws on HTTP failure or `status:false`. */
  async call<T = unknown>(path: string, options: RequestOptions = {}): Promise<Envelope<T>> {
    const method = options.method ?? "GET";
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(formatPaystackError(res.status, method, url.pathname, text));
    }
    if (!text) return {};
    let parsed: Envelope<T>;
    try {
      parsed = JSON.parse(text) as Envelope<T>;
    } catch {
      throw new Error(
        `Paystack returned a non-JSON body for ${method} ${url.pathname}: ${truncate(text, 200)}`,
      );
    }
    if (parsed.status === false) {
      throw new Error(formatPaystackError(res.status, method, url.pathname, text));
    }
    return parsed;
  }

  /** Call and return only `data`. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return (await this.call<T>(path, options)).data as T;
  }

  /** Call a list endpoint and return `{items, meta}`. */
  async list<T = unknown>(
    path: string,
    query: Record<string, QueryValue> = {},
  ): Promise<{ items: T[]; meta: Record<string, unknown> | undefined }> {
    const env = await this.call<T[]>(path, { query });
    return { items: Array.isArray(env.data) ? env.data : [], meta: env.meta };
  }
}
