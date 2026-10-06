import type { HookContext } from "@w6w/types";

/** Every v2 path hangs off this base (the AEP lives at `/api/v2/`). v1 is deprecated and not used. */
export const API_URL = "https://actionnetwork.org/api/v2";

/** Largest page the server returns (`max_page_size` on the AEP). */
export const MAX_PAGE_SIZE = 25;

/**
 * Percent-encode one path segment. Action Network ids are UUIDs, but the API also prints them as
 * `action_network:<uuid>` in `identifiers`, so that prefix is accepted and stripped.
 */
export function seg(value: unknown): string {
  return encodeURIComponent(String(value).trim().replace(/^action_network:/, ""));
}

/** Read a required string/number input, with a readable error when a form left it blank. */
export function need(input: Record<string, unknown>, key: string): string {
  const v = input[key];
  if (v === undefined || v === null || String(v).trim() === "") {
    throw new Error(`${key} is required`);
  }
  return String(v);
}

/**
 * Accept a list as a real array or as the comma-separated text a form field produces. Empty
 * entries are dropped; an empty result is `undefined`.
 */
export function strList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Accept a JSON value either parsed or as the JSON text a form field produces. Anything
 * unparseable passes through so the vendor, not this app, rejects it.
 */
export function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/** Drop `undefined` and empty-string values so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""),
  );
}

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Build `?a=1&b=2`, skipping unset, null and empty values. */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/**
 * Action Network's auth failure is `{"error":"API Key invalid or not present <the key you sent>"}`
 * — the vendor echoes the presented credential back. Cut everything after the fixed phrase so a
 * thrown error, a run record or a log line can never carry the key.
 */
export function redact(text: string): string {
  return text.replace(/(API Key invalid or not present)[^"\n]*/gi, "$1");
}

/** One human line from a parsed error body (`{ error: "..." }`) or the raw text. */
export function errorText(body: unknown, raw = ""): string {
  const err = (body as { error?: unknown } | null)?.error;
  if (typeof err === "string" && err.trim() !== "") return redact(err).trim();
  if (err && typeof err === "object") return redact(JSON.stringify(err)).slice(0, 300);
  return redact(raw).trim().slice(0, 200);
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
  /** `background_request=true`: the vendor queues the work and answers `{}` at once. */
  background?: boolean;
}

/** The native identifier of a resource: the `action_network:` entry of `identifiers`. */
export function resourceId(resource: unknown): string | undefined {
  const ids = (resource as { identifiers?: unknown } | null)?.identifiers;
  if (!Array.isArray(ids)) return undefined;
  const hit = ids.find((i) => typeof i === "string" && i.startsWith("action_network:"));
  return typeof hit === "string" ? hit.slice("action_network:".length) : undefined;
}

/** A HAL resource without its link and embed scaffolding, plus a plain `id`. */
export function simplify(resource: unknown): unknown {
  if (!resource || typeof resource !== "object" || Array.isArray(resource)) return resource;
  const { _links: _l, _embedded: _e, ...rest } = resource as Record<string, unknown>;
  const id = resourceId(resource);
  return id ? { id, ...rest } : rest;
}

export interface Page {
  items: unknown[];
  page?: number;
  perPage?: number;
  totalPages?: number;
  totalRecords?: number;
  /** True when the response carries a `next` link. */
  hasMore: boolean;
}

/**
 * Flatten a HAL collection. The embedded array is named after the resource (`osdi:people`,
 * `osdi:petitions`, `action_network:surveys`, ...), so take the first array under `_embedded`.
 * `total_pages` / `total_records` are absent on some collections (people), so they stay optional.
 */
export function simplifyPage(body: unknown): Page {
  const b = (body ?? {}) as Record<string, unknown>;
  const embedded = (b._embedded ?? {}) as Record<string, unknown>;
  const items = Object.values(embedded).find(Array.isArray) as unknown[] | undefined;
  const links = (b._links ?? {}) as Record<string, unknown>;
  const out: Page = { items: (items ?? []).map(simplify), hasMore: Boolean(links.next) };
  if (typeof b.page === "number") out.page = b.page;
  if (typeof b.per_page === "number") out.perPage = b.per_page;
  if (typeof b.total_pages === "number") out.totalPages = b.total_pages;
  if (typeof b.total_records === "number") out.totalRecords = b.total_records;
  return out;
}

/**
 * Thin client over `https://actionnetwork.org/api/v2`. Credentials are never handled here: the
 * runtime routes every `ctx.fetch` through the Auth `sign` hook, which stamps `OSDI-API-Token`.
 */
export class ActionNetworkClient {
  constructor(private readonly ctx: HookContext) {}

  async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const query: Query = { ...options.query };
    if (options.background) query.background_request = "true";
    const url = `${API_URL}${path}${buildQuery(query)}`;
    const headers: Record<string, string> = { accept: "application/hal+json, application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch { /* non-JSON body: reported below if the request failed */ }
    }

    if (!res.ok) {
      throw new Error(
        `Action Network ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}`,
      );
    }
    return (parsed ?? {}) as T;
  }

  /** `GET` a single resource, flattened. */
  async get(path: string): Promise<unknown> {
    return simplify(await this.request("GET", path));
  }

  /** `GET` a collection, flattened to `{ items, page, perPage, totalPages?, hasMore }`. */
  async list(path: string, input: Record<string, unknown>): Promise<Page> {
    return simplifyPage(
      await this.request("GET", path, {
        query: {
          page: input.page as number | undefined,
          per_page: input.perPage as number | undefined,
          filter: input.filter as string | undefined,
        },
      }),
    );
  }

  /** `POST` and flatten the answer (an empty `{}` for a background request). */
  async create(path: string, body: unknown, background?: boolean): Promise<unknown> {
    return simplify(await this.request("POST", path, { body, background }));
  }

  /** `PUT` and flatten the answer. */
  async update(path: string, body: unknown, background?: boolean): Promise<unknown> {
    return simplify(await this.request("PUT", path, { body, background }));
  }
}
