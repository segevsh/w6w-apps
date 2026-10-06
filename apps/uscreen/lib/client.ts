import type { HookContext } from "@w6w/types";

/**
 * Uscreen Publisher API client.
 *
 * Verified 2026-10-06 against the vendor's Swagger 2.0 document
 * (`https://uscreen.io/api/publisher.yml`, v1.0.2) and live probes of
 * `uscreen.io/publisher_api/v1`. Host `uscreen.io`, base path `/publisher_api/v1`.
 *
 * Auth is stamped by the Auth `sign` hook (`Authorization: <key>`); nothing in this file
 * ever sees the credential.
 *
 * Conventions that differ from the usual REST shapes:
 *  - **Pagination is in headers.** A list body is a bare JSON array; `Total-Count` and an
 *    RFC 5988 `Link` header carry the rest. `/invoices` and `/analytics/videos/views/summary`
 *    report `Total-Count: 10000+` past 10 000 and send no `last` link.
 *  - **204 is a real answer.** `GET`/`DELETE …/subscription` answer 204 with no body when the
 *    customer has no active subscription; that surfaces here as `null`.
 *  - **Errors have two shapes**: `{"message": "…"}` and (422 on writes) a field map such as
 *    `{"email": ["has already been taken"]}`.
 */
export const API_HOST = "uscreen.io";
export const API_BASE = `https://${API_HOST}/publisher_api/v1`;

export type Scalar = string | number | boolean | null | undefined;

/** Percent-encode one path segment. A customer id may be an email address. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value).trim());
}

/** Drop unset values so an omitted optional param never reaches the wire. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export function buildUrl(path: string, query: Record<string, Scalar> = {}): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return `${API_BASE}${path}${s ? `?${s}` : ""}`;
}

export interface UscreenPage<T = unknown> {
  items: T[];
  /** Parsed `Total-Count`; null when the header is absent. Capped at 10000 on two endpoints. */
  totalCount: number | null;
  /** True when `Total-Count` was reported as `10000+` (the real total is larger). */
  totalCountCapped: boolean;
  /** The page this response is, as requested (1 when none was given). */
  page: number;
  /** Next page number from the `Link: rel="next"` header, or null on the last page. */
  nextPage: number | null;
  hasMore: boolean;
}

/** Extract the `page` of the `rel="next"` link, or null. */
export function nextPageFromLink(link: string | null): number | null {
  if (!link) return null;
  for (const part of link.split(/,\s*(?=<)/)) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
    if (!m) continue;
    const page = m[1].match(/[?&]page=(\d+)/);
    return page ? Number(page[1]) : null;
  }
  return null;
}

/** The vendor's own error text, from either error shape. */
export function errorText(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.message === "string") return obj.message;
  const fields = Object.entries(obj)
    .filter(([, v]) => Array.isArray(v) && v.every((m) => typeof m === "string"))
    .map(([k, v]) => `${k} ${(v as string[]).join(", ")}`);
  return fields.length > 0 ? fields.join("; ") : undefined;
}

export class UscreenError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = "UscreenError";
  }
}

interface RequestOptions {
  query?: Record<string, Scalar>;
  body?: Record<string, unknown>;
}

export class UscreenClient {
  constructor(private ctx: HookContext) {}

  private async send(method: string, path: string, opts: RequestOptions) {
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(buildUrl(path, opts.query), { method, headers, body });
    const text = res.status === 204 ? "" : await res.text().catch(() => "");
    let data: unknown = null;
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      const detail = errorText(data) ?? (text.trim().slice(0, 200) || res.statusText || "error");
      throw new UscreenError(
        res.status,
        `Uscreen ${method} ${path} failed (${res.status}): ${detail}`,
        data,
      );
    }
    return { res, data };
  }

  /** Single JSON object (or null on 204 / an empty 200). */
  async call<T = unknown>(
    method: string,
    path: string,
    opts: RequestOptions = {},
  ): Promise<T | null> {
    const { data } = await this.send(method, path, opts);
    return data as T | null;
  }

  /** A paginated list: bare array body, pagination from headers. */
  async list<T = unknown>(
    path: string,
    query: Record<string, Scalar> = {},
  ): Promise<UscreenPage<T>> {
    const { res, data } = await this.send("GET", path, { query });
    const total = res.headers.get("total-count");
    const next = nextPageFromLink(res.headers.get("link"));
    return {
      items: Array.isArray(data) ? data as T[] : [],
      totalCount: total && /^\d+/.test(total) ? parseInt(total, 10) : null,
      totalCountCapped: total ? /\+\s*$/.test(total) : false,
      page: typeof query.page === "number" ? query.page : Number(query.page) || 1,
      nextPage: next,
      hasMore: next !== null,
    };
  }
}

/** Split a comma- or newline-separated string (or pass an array through) into trimmed items. */
export function csv(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value : String(value).split(/[,\n]/);
  const out = items.map((s) => String(s).trim()).filter((s) => s !== "");
  return out;
}

/** `csv`, parsed to integers; a non-integer item is an error, not a silent NaN. */
export function csvInts(value: string | string[] | undefined): number[] | undefined {
  const items = csv(value);
  if (!items) return undefined;
  return items.map((s) => {
    if (!/^\d+$/.test(s)) throw new Error(`"${s}" is not a whole-number id`);
    return Number(s);
  });
}
