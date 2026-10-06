/**
 * Docparser API client — `https://api.docparser.com`.
 *
 * Read off https://docparser.com/api/ (last updated by the vendor 2018-02-13, with the v2
 * fetch/status routes added later) and probed live on 2026-10-06 with an invalid key:
 *
 *  1. **The version is part of the path and differs per route.** Most routes are `/v1/...`;
 *     URL import (`fetch`) and document status are `/v2/...`. Pass the full versioned path.
 *  2. **Request bodies are form-encoded**, never JSON (`url`, `file_content`, `document_ids[]`).
 *  3. **Errors are `{"error": "<text>"}`** and an invalid key is **HTTP 403** with
 *     `{"error":"api key not valid"}`, not 401. There is no machine code, so callers classify
 *     from the text.
 *  4. **List routes answer a bare JSON array** (parsers, layouts, results) — wrapped here as
 *     `{items, count}`.
 */
import type { HookContext } from "@w6w/types";

export const API_BASE = "https://api.docparser.com";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Form fields. Array values are sent as repeated `name[]` keys. */
  form?: Record<string, string | string[] | undefined | null>;
}

export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Accept a real array or a comma/newline-separated string from a form field. */
export function toList(v: string[] | string | undefined | null): string[] {
  if (v === undefined || v === null || v === "") return [];
  return (Array.isArray(v) ? v : v.split(/[,\n]/)).map((s) => String(s).trim()).filter(Boolean);
}

export function encodeId(id: string, name = "id"): string {
  const v = String(id ?? "").trim();
  if (!v) throw new Error(`${name} is required`);
  return encodeURIComponent(v);
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

export function formatError(status: number, method: string, path: string, raw: string): string {
  let message = "";
  try {
    const parsed = JSON.parse(raw) as { error?: unknown; msg?: unknown };
    const e = parsed?.error ?? parsed?.msg;
    if (typeof e === "string") message = e;
  } catch { /* not JSON */ }
  return truncate(`Docparser ${status} for ${method} ${path}: ${message || raw}`, 1000);
}

export interface Page<T> {
  items: T[];
  count: number;
}

export function pageOf<T>(rows: T[] | undefined | null): Page<T> {
  const items = Array.isArray(rows) ? rows : [];
  return { items, count: items.length };
}

export class DocparserClient {
  constructor(private ctx: HookContext) {}

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const method = options.method ?? "GET";
    const init: RequestInit = { method, headers };
    if (options.form) {
      const body = new URLSearchParams();
      for (const [k, v] of Object.entries(options.form)) {
        if (v === undefined || v === null || v === "") continue;
        if (Array.isArray(v)) { for (const item of v) body.append(`${k}[]`, item); }
        else body.set(k, v);
      }
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = body.toString();
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(formatError(res.status, method, url.pathname, text));
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Docparser returned a non-JSON body for ${method} ${url.pathname}`);
    }
  }
}
