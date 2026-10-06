import type { HookContext } from "@w6w/types";

/** Every path in this app hangs off this one base. The version IS in the path. */
export const API_URL = "https://api.mailersend.com/v1";

type Scalar = string | number | boolean;
export type QueryValue = Scalar | Scalar[] | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** What a call produced: the parsed body (or `null` when empty) plus the headers. */
export interface ApiResult<T = unknown> {
  status: number;
  headers: Headers;
  body: T | null;
}

/** MailerSend's error body: `{ message, errors?: { "field.path": ["msg #MS42207"] } }`. */
export interface ErrorBody {
  message?: string;
  errors?: Record<string, string[] | string>;
}

/**
 * Turn an error body into one sentence. The vendor's own `#MSxxxxx` codes ride at the
 * end of each message (`…must be verified in your account to send emails. #MS42207`)
 * and are kept: they are the documented key into the error table.
 */
export function describeError(status: number, body: ErrorBody | null, raw: string): string {
  if (!body || typeof body !== "object") return raw.slice(0, 300) || `HTTP ${status}`;
  const parts = [body.message ?? `HTTP ${status}`];
  for (const [field, msgs] of Object.entries(body.errors ?? {})) {
    parts.push(`${field}: ${(Array.isArray(msgs) ? msgs : [msgs]).join(" ")}`);
  }
  return parts.join(" ");
}

export class MailerSendClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // The vendor's array filters are PHP-style: `status[]=sent&status[]=delivered`.
      // `?status=sent` is a 422, so an array always goes out with the brackets.
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(`${k}[]`, String(item));
      } else url.searchParams.set(k, String(v));
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const raw = await res.text().catch(() => "");
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch { /* a non-JSON body: handled below for errors, ignored for empty 2xx */ }

    if (!res.ok) {
      const retry = res.headers.get("retry-after");
      const tail = res.status === 429 && retry ? ` (retry after ${retry}s)` : "";
      throw new Error(
        `MailerSend ${res.status} for ${method} ${url.pathname.replace(/^\/v1/, "")}: ${
          describeError(res.status, parsed as ErrorBody | null, raw)
        }${tail}`,
      );
    }
    return { status: res.status, headers: res.headers, body: parsed as T | null };
  }

  /** GET/POST/PUT whose useful answer is the body. An empty body reads as `{}`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { body } = await this.request<T>(path, options);
    return (body ?? {}) as T;
  }
}

/** Encode one path segment. */
export function seg(value: string): string {
  return encodeURIComponent(value);
}

/** Drop keys whose value is `undefined`, `null` or an empty string. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/** `[a, b]` or `"a, b"` -> `["a", "b"]`; anything else -> `undefined`. */
export function toList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const out = value.map((v) => String(v).trim()).filter(Boolean);
    return out.length ? out : undefined;
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}

export interface Recipient {
  email: string;
  name?: string;
}

/**
 * Accepts `["a@x.com"]`, `[{email, name}]`, or `"a@x.com, b@x.com"` and returns the
 * `[{email, name?}]` the API wants. A bare string becomes `{ email }`.
 */
export function toRecipients(value: unknown): Recipient[] | undefined {
  const items = typeof value === "string"
    ? toList(value)
    : Array.isArray(value)
    ? value
    : undefined;
  if (!items || items.length === 0) return undefined;
  return items.map((item) => typeof item === "string" ? { email: item } : item as Recipient);
}

/** Remove any key containing "secret" (case-insensitive), at any depth. */
export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => redactSecrets(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/secret/i.test(k)) continue;
      out[k] = redactSecrets(v);
    }
    return out as T;
  }
  return value;
}

/** `page` + `limit` for the Laravel-style paginated lists (`data`, `links`, `meta`). */
export const PAGE_PARAMS = [
  { key: "page", label: "Page", type: "number" as const, validation: { min: 1, integer: true } },
  {
    key: "limit",
    label: "Limit",
    type: "number" as const,
    hint: "Results per page. MailerSend accepts 10 to 100 (default 25).",
    validation: { min: 10, max: 100, integer: true },
  },
];

export const PAGE_OUTPUT = [
  { key: "data", type: "array" as const, label: "Results for this page" },
  { key: "links", type: "object" as const, label: "first / last / prev / next page URLs" },
  {
    key: "meta",
    type: "object" as const,
    label: "current_page, per_page, total, last_page …",
  },
];

export interface PageInput {
  page?: number;
  limit?: number;
}

export function pageQuery(input: PageInput): Record<string, QueryValue> {
  return { page: input.page, limit: input.limit };
}

export const DOMAIN_ID_FILTER = {
  key: "domainId",
  label: "Domain ID",
  type: "string" as const,
  hint: "Optional. Restrict to one sending domain (the `id` from List Domains).",
};

/** Date params shared by activity/emails/analytics: a Unix timestamp or a datetime, UTC. */
export function dateParam(key: string, label: string, required: boolean) {
  return {
    key,
    label,
    type: "string" as const,
    required,
    placeholder: "2026-10-01 00:00:00",
    hint: "UTC. A Unix timestamp (1443651141) or a datetime (2015-10-01 00:00:00).",
  };
}

/** A UTC datetime/Unix string -> the form the endpoint wants. Numeric strings become numbers. */
export function toTimestamp(value: string | number | undefined): string | number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return value;
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : value;
}

/**
 * Analytics wants `date_from`/`date_to` as integers. Accept a Unix timestamp, or a UTC
 * datetime (`2026-10-01 00:00:00` / ISO 8601) and convert it. A bare date-time with no
 * zone is read as UTC, which is what the vendor does too.
 */
export function toUnix(value: string | number): number {
  if (typeof value === "number") return Math.floor(value);
  const s = value.trim();
  if (/^\d+$/.test(s)) return Number(s);
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s.replace(" ", "T")}Z`;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`cannot read "${value}" as a Unix timestamp or datetime`);
  return Math.floor(ms / 1000);
}
