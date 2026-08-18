import type { HookContext } from "@w6w/types";

/**
 * EasyPost's v2 API — verified against EasyPost's own Node SDK
 * (`github.com/EasyPost/easypost-node`, `src/services/*.js`, read 2026-08-18),
 * which is the authoritative statement of the surface since EasyPost publishes
 * no OpenAPI document, and probed live the same day.
 *
 * ## Shipping is two steps, and only the second one costs money
 *
 * This is the shape everything here is built around:
 *
 *   1. **Create a shipment** — a from address, a to address and a parcel.
 *      EasyPost answers with a `rates` array: every carrier and service that
 *      will carry it, priced. Nothing has been bought and nothing is owed.
 *   2. **Buy** one of those rates. *Now* money moves, a label exists, and a
 *      tracking code is issued.
 *
 * Keeping those apart is the whole reason `shipment-create` and `shipment-buy`
 * are separate actions rather than one convenient call — a workflow that quotes
 * and a workflow that spends should not be the same step.
 *
 * ## Request bodies are wrapped in their type
 *
 * `{"shipment": {...}}`, `{"parcel": {...}}`, `{"tracker": {...}}`,
 * `{"address": {...}}`. Sending the bare object is accepted by nothing and
 * fails with a validation error that does not mention the wrapper, so the
 * client does the wrapping and no action has to remember.
 *
 * ## The key prefix decides whether any of this is real
 *
 * EasyPost issues test and production keys. A test key produces shipments,
 * rates and labels that look complete and are not: the label is not valid
 * postage and nothing is charged. That is exactly what you want while building
 * and exactly what you do not want in production, and the two are told apart
 * only by the key.
 */
export const BASE_URL = "https://api.easypost.com";
export const API_PATH = "/v2";

/** EasyPost limits index (list) endpoints to five requests a second. */
export const INDEX_RATE_PER_SECOND = 5;

/** A page of a list endpoint; EasyPost caps `page_size` at 100. */
export const PAGE_LIMIT = 100;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** The object to send. It is wrapped in `wrapIn` when that is given. */
  body?: Record<string, unknown>;
  /** The type key EasyPost expects the body under — `shipment`, `parcel`, … */
  wrapIn?: string;
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | Array<string | number> | undefined | null;

/** Drop keys the caller left unset, so an omitted field stays omitted. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** `compact` for a query string, keeping the value type the client expects. */
export function query(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      const items = v.map((i) => (typeof i === "number" ? i : String(i)));
      if (items.length === 0) continue;
      out[k] = items;
      continue;
    }
    if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else out[k] = String(v);
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * An address, given either inline or by id.
 *
 * EasyPost accepts both everywhere, and a workflow shipping repeatedly from one
 * warehouse should create that address once and pass its id — it is one fewer
 * object created per shipment, and it is the address EasyPost has already
 * verified.
 */
export function addressRef(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return undefined;
    // An id, not JSON. Parsing it first would fail on a perfectly good `adr_…`.
    if (!/^[{[]/.test(text)) return { id: text };
    return json(text, field);
  }
  return value;
}

/**
 * A shipment's rates, cheapest first.
 *
 * EasyPost returns them unordered, and `rate` is a **string** — comparing them
 * as strings puts "9.99" above "10.05", which is the sort of bug that buys the
 * wrong label and is never noticed.
 */
export interface Rate {
  id?: string;
  carrier?: string;
  service?: string;
  rate?: string;
  currency?: string;
  delivery_days?: number | null;
  est_delivery_days?: number | null;
}

export function sortRates(rates: Rate[]): Rate[] {
  return [...rates].sort((a, b) => Number(a?.rate ?? Infinity) - Number(b?.rate ?? Infinity));
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class EasyPostClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${API_PATH}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(`${k}[]`, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      // EasyPost expects the object under its type key. Sending it bare fails
      // with a validation error that never mentions the wrapper.
      init.body = JSON.stringify(
        options.wrapIn ? { [options.wrapIn]: options.body } : options.body,
      );
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `EasyPost ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Turn an EasyPost error into something actionable.
 *
 * Errors arrive as `{"error": {"code", "message", "errors": [...]}}`, and the
 * nested `errors` array is the half worth surfacing — it names the field, which
 * on an address or a parcel is almost always the actual problem.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as {
      error?: {
        code?: string;
        message?: string | string[];
        errors?: Array<{ field?: string; message?: string; suggestion?: string }>;
      };
    };
    const err = body?.error ?? {};
    const message = Array.isArray(err.message) ? err.message.join("; ") : err.message;
    const parts = [message ?? err.code ?? detail];
    if (err.code && message) parts.push(`(${err.code})`);
    const fields = (err.errors ?? [])
      .map((e) =>
        [e.field, e.message, e.suggestion ? `suggested: ${e.suggestion}` : undefined]
          .filter(Boolean)
          .join(": ")
      )
      .filter(Boolean);
    if (fields.length > 0) parts.push(`— ${fields.join("; ")}`);
    detail = parts.join(" ");
  } catch { /* not JSON */ }

  if (status === 401 || status === 403) {
    return `${detail} — check the API key. EasyPost keys are per-environment, and a deactivated ` +
      "or rotated key answers here rather than at connect time";
  }
  if (status === 422) {
    return `${detail} — EasyPost validated the request; the field named above is the one to fix`;
  }
  if (status === 429) {
    return `${detail} — EasyPost limits list endpoints to ${INDEX_RATE_PER_SECOND} requests per ` +
      "second. This is a burst limit rather than a quota, so spacing the calls out fixes it";
  }
  return detail || `${status}`;
}
