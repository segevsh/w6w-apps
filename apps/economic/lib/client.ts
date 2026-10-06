import type { HookContext } from "@w6w/types";

/**
 * e-conomic (Visma e-conomic) REST API client.
 *
 * Verified 2026-10-06 against restdocs.e-conomic.com and live probes of `restapi.e-conomic.com`
 * with the documented public `demo`/`demo` token pair (GET only).
 *
 * - One fixed host, `https://restapi.e-conomic.com`, no versioned prefix. The root document lists
 *   every resource under `stable` (nothing `experimental`, nothing `deprecated`).
 * - Auth is two headers, `X-AppSecretToken` + `X-AgreementGrantToken`, both added by `sign`.
 * - A collection answers `{collection: [...], pagination: {skipPages, pageSize, maxPageSizeAllowed,
 *   results, resultsWithoutFilter, firstPage, nextPage?, lastPage}}`. Paging is `pagesize`
 *   (max 1000) + `skippages`; `nextPage` is present only while more pages remain.
 * - Errors are `{message, developerHint?, errorCode?, httpStatusCode, logId}`; a validation error
 *   (400) also carries `errors`, a document shaped like the request with each bad property
 *   replaced by `{errors: [{errorCode, message, value}]}`.
 */

export const BASE_URL = "https://restapi.e-conomic.com";

/** Percent-encode one path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Build `?a=1&b=2`, skipping unset and empty values. */
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

/** Drop `undefined` values so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""));
}

/**
 * Accept a JSON value either parsed or as the JSON text a form field produces. Anything
 * unparseable passes through so e-conomic, not this app, rejects it.
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

/** A `{xNumber: n}` reference object, the shape every cross-resource link takes in a body. */
export function ref(
  key: string,
  value: string | number | undefined,
): Record<string, unknown> | undefined {
  return value === undefined || value === "" ? undefined : { [key]: value };
}

interface ApiError {
  message?: unknown;
  developerHint?: unknown;
  errorCode?: unknown;
  errors?: unknown;
}

/** Flatten the annotated `errors` document into `path: message` lines. */
function validationLines(errors: unknown, path = ""): string[] {
  if (!errors || typeof errors !== "object") return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    const here = path ? `${path}.${key}` : key;
    if (key === "errors" && Array.isArray(value)) {
      for (const e of value as Array<{ message?: unknown; errorCode?: unknown }>) {
        if (typeof e?.message === "string") {
          out.push(`${path}: ${e.message}${e.errorCode ? ` (${e.errorCode})` : ""}`);
        }
      }
    } else if (value && typeof value === "object") {
      out.push(...validationLines(value, here));
    }
  }
  return out;
}

/** One human line from a parsed error body, including the per-property validation detail. */
export function errorText(body: unknown, raw = ""): string {
  const e = body as ApiError | null;
  if (typeof e?.message !== "string" || !e.message) return raw.trim().slice(0, 200);
  const code = typeof e.errorCode === "string" ? ` (${e.errorCode})` : "";
  const lines = validationLines(e.errors).slice(0, 8);
  return `${e.message}${code}${lines.length ? ` — ${lines.join("; ")}` : ""}`;
}

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

export class EconomicClient {
  constructor(private readonly ctx: HookContext) {}

  /** Issue a request; returns the parsed JSON body (`{}` for an empty one, e.g. a 204). */
  async request<T = Record<string, unknown>>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${BASE_URL}${path}${buildQuery(options.query)}`;
    const headers: Record<string, string> = { accept: "application/json" };
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
        `e-conomic ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}`,
      );
    }
    return (parsed ?? {}) as T;
  }
}

interface Page {
  collection?: unknown;
  pagination?: { results?: number; nextPage?: string; skipPages?: number; pageSize?: number };
}

/** Shape a collection response into `{items, count, total, hasMore, nextSkipPages}`. */
export function pageOf(body: unknown) {
  const b = body as Page | null;
  const items = Array.isArray(b?.collection) ? b!.collection as unknown[] : [];
  const p = b?.pagination ?? {};
  const hasMore = typeof p.nextPage === "string" && p.nextPage !== "";
  return {
    items,
    count: items.length,
    total: typeof p.results === "number" ? p.results : items.length,
    hasMore,
    ...(hasMore ? { nextSkipPages: (p.skipPages ?? 0) + 1 } : {}),
  };
}
