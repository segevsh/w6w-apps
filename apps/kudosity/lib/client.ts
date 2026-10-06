import type { HookContext } from "@w6w/types";

/**
 * Kudosity Transmit Message API v2 client.
 *
 * Verified 2026-10-06 against the per-endpoint OpenAPI fragments published at
 * developers.kudosity.com/reference (server `https://api.transmitmessage.com`, every path
 * prefixed `/v2`, auth header `x-api-key`) plus unsigned and bogus-key probes of the live host.
 *
 * ## Two response families under one prefix
 *
 *  - **SMS, MMS and webhooks** answer the resource itself: `GET /v2/sms/{id}` is the message, and
 *    lists wrap in a named array (`smses`, `webhooks`). Errors are `{"error": "<text>"}`.
 *  - **WhatsApp, RCS, RCS capabilities and sender registrations** answer `{"data": …, "meta": …}`
 *    and RFC 9457-style errors `{"error": {type, title, detail, status, issues?}}`.
 *
 * {@link KudosityClient.json} returns the body untouched; {@link KudosityClient.data} unwraps the
 * envelope. The auth layer answers its own shape, `{"status": "Unauthorized"}`, before either.
 */
export const API_BASE = "https://api.transmitmessage.com";
export const API_PREFIX = "/v2";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export interface KudosityErrorBody {
  status?: unknown;
  error?: unknown;
}

/** A readable message from any of the three error shapes this API answers. */
export function formatError(status: number, body: unknown): string {
  const b = (body && typeof body === "object" ? body : {}) as KudosityErrorBody;
  const err = b.error;
  if (typeof err === "string" && err) return `HTTP ${status}: ${err}`;
  if (err && typeof err === "object") {
    const e = err as {
      title?: string;
      detail?: string;
      issues?: Array<{ name?: string; message?: string }>;
    };
    const head = [e.title, e.detail].filter((s) => typeof s === "string" && s).join(": ");
    const issues = (e.issues ?? [])
      .map((i) => [i.name, i.message].filter(Boolean).join(" "))
      .filter(Boolean)
      .join("; ");
    const text = [head, issues && `(${issues})`].filter(Boolean).join(" ");
    if (text) return `HTTP ${status}: ${text}`;
  }
  if (typeof b.status === "string" && b.status) return `HTTP ${status}: ${b.status}`;
  return `HTTP ${status}`;
}

export function encodeId(id: string): string {
  return encodeURIComponent(String(id).trim());
}

/** Drop undefined/null/empty-string values so optional inputs never reach the wire. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

export class KudosityClient {
  constructor(private readonly ctx: HookContext) {}

  url(path: string, query?: Record<string, QueryValue>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) v.forEach((item) => qs.append(k, String(item)));
      else qs.append(k, String(v));
    }
    const q = qs.toString();
    return `${API_BASE}${API_PREFIX}${path}${q ? `?${q}` : ""}`;
  }

  /** Performs the call; throws on any non-2xx. Returns the parsed body (null when empty). */
  async json<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (opts.body !== undefined) headers["content-type"] = "application/json";
    const res = await this.ctx.fetch(this.url(path, opts.query), {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const text = await res.text().catch(() => "");
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }
    if (!res.ok) throw new Error(`Kudosity ${formatError(res.status, parsed)}`);
    return parsed as T;
  }

  /** For the `{"data": …, "meta": …}` family. Returns `{ data, meta }`. */
  async data<T = unknown>(
    path: string,
    opts: RequestOptions = {},
  ): Promise<{ data: T; meta: Record<string, unknown> | undefined }> {
    const body = await this.json<{ data?: T; meta?: Record<string, unknown> } | null>(path, opts);
    return { data: (body?.data ?? null) as T, meta: body?.meta };
  }
}
