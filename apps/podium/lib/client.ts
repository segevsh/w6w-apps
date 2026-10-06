import type { HookContext } from "@w6w/types";

/** Every documented operation lives under `https://api.podium.com/v4`. */
export const API_BASE = "https://api.podium.com";
export const API_PREFIX = "/v4";

/** OAuth endpoints (docs.podium.com/docs/oauth). Same host as the API. */
export const AUTHORIZE_URL = `${API_BASE}/oauth/authorize`;
export const TOKEN_URL = `${API_BASE}/oauth/token`;

export type QueryValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, string | undefined>
  | undefined
  | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Top-level fields to delete from the response data before it is returned. */
  redact?: readonly string[];
}

/** The shape every Podium response shares: `{ data, metadata }`. */
interface Envelope<T> {
  data?: T;
  metadata?: { nextCursor?: string | null; previousCursor?: string | null; [k: string]: unknown };
}

export interface ListResult<T> {
  items: T[];
  /** Pass back as `cursor` for the next page; `null` on the last page. */
  nextCursor: string | null;
}

interface PodiumErrorBody {
  code?: string;
  message?: string;
  moreInfo?: string;
}

/** Drop undefined / null / empty-string members. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Comma-separated string (or array) -> trimmed non-empty list, or undefined. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** A JSON param that may arrive as an object/array or as a JSON string. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/** Two optional bounds -> a `deepObject` filter, or undefined when neither is set. */
export function range(
  from: string | undefined,
  to: string | undefined,
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  if (from) out.gte = from;
  if (to) out.lte = to;
  return Object.keys(out).length ? out : undefined;
}

/** Path segment: contact identifiers are emails and `+`-prefixed phone numbers. */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

export function truncate(text: string, max = 400): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes)`;
}

/**
 * Podium error bodies are `{ code, message, moreInfo }`. Read the vendor's own
 * `code` rather than trusting the status alone.
 */
export function formatPodiumError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let detail = raw;
  try {
    const body = JSON.parse(raw) as PodiumErrorBody;
    if (body && (body.code || body.message)) {
      detail = [body.code, body.message].filter(Boolean).join(": ");
    }
  } catch {
    // not JSON — fall through with the raw text
  }
  return `Podium ${method} ${path} -> ${status}${detail ? ` ${truncate(detail)}` : ""}`;
}

export class PodiumClient {
  constructor(private ctx: HookContext) {}

  /** One resource: returns the envelope's `data`. */
  async one<T = Record<string, unknown>>(path: string, options: RequestOptions = {}): Promise<T> {
    const env = await this.send<T>(path, options);
    return this.redact(env.data ?? ({} as T), options.redact) as T;
  }

  /** A collection: `{ items, nextCursor }`. */
  async list<T = Record<string, unknown>>(
    path: string,
    options: RequestOptions = {},
  ): Promise<ListResult<T>> {
    const env = await this.send<T[] | T>(path, options);
    const raw = Array.isArray(env.data) ? env.data : [];
    return {
      items: raw.map((i) => this.redact(i, options.redact) as T),
      nextCursor: env.metadata?.nextCursor ?? null,
    };
  }

  private redact(value: unknown, fields?: readonly string[]): unknown {
    if (!fields?.length || !value || typeof value !== "object") return value;
    const copy = { ...(value as Record<string, unknown>) };
    for (const f of fields) delete copy[f];
    return copy;
  }

  private async send<T>(path: string, options: RequestOptions): Promise<Envelope<T>> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        // `?searchFields[]=name&searchFields[]=phone` (documented form)
        for (const item of v) url.searchParams.append(`${k}[]`, String(item));
      } else if (typeof v === "object") {
        // deepObject: `?createdAt[gte]=…&createdAt[lte]=…`
        for (const [sub, subValue] of Object.entries(v)) {
          if (subValue !== undefined && subValue !== "") {
            url.searchParams.set(`${k}[${sub}]`, subValue);
          }
        }
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(formatPodiumError(res.status, method, url.pathname, text));
    if (!text) return {};
    try {
      return JSON.parse(text) as Envelope<T>;
    } catch {
      throw new Error(`Podium ${method} ${url.pathname} returned a non-JSON ${res.status} body`);
    }
  }
}
