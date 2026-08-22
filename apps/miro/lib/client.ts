import type { HookContext } from "@w6w/types";

/**
 * Miro's Developer Platform v2 — one host, verified against Miro's own OpenAPI
 * document (https://raw.githubusercontent.com/miroapp/api-clients/main/packages/generator/spec.json,
 * "Miro Developer Platform" v2.0, 114 paths, fetched 2026-08-18). Its `servers`
 * names exactly `https://api.miro.com/`, and its only security scheme is
 * `oAuth2AuthCode`.
 *
 * **A quirk of that document, handled here rather than copied.** Several board
 * endpoints appear under renamed path parameters —
 * `/v2/boards/{board_id_PlatformTags}/items`,
 * `/v2/boards/{board_id_PlatformContainers}/items`,
 * `/v2/boards/{board_id_PlatformFileUpload}/images` and friends. Those are
 * generator artifacts: the parameter is renamed per tag so the same path can
 * appear more than once, and each one's description is the same "Unique
 * identifier (ID) of the board". On the wire they are all
 * `/v2/boards/{board_id}/…`, distinguished only by their query parameters
 * (`tag_id`, `parent_item_id`). A code generator that took the templates
 * literally would emit URLs Miro does not serve, so this app builds the real
 * paths.
 */
export const API_URL = "https://api.miro.com";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Usually an object; `POST /v2/boards/{id}/items/bulk` takes a bare array. */
  body?: unknown;
}

/** Drop keys the caller left unset so a PATCH doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    out[k] = v;
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
 * Build the `{x, y}` position object Miro takes on every item, from two number
 * params. Returns undefined when neither was set, so the item lands wherever
 * Miro puts it by default rather than at a spurious origin.
 */
export function position(x: unknown, y: unknown): { x: number; y: number } | undefined {
  const nx = typeof x === "number" ? x : undefined;
  const ny = typeof y === "number" ? y : undefined;
  if (nx === undefined && ny === undefined) return undefined;
  return { x: nx ?? 0, y: ny ?? 0 };
}

/** Build the `{width, height}` geometry object, omitting unset dimensions. */
export function geometry(
  width: unknown,
  height: unknown,
  rotation?: unknown,
): Record<string, number> | undefined {
  const out: Record<string, number> = {};
  if (typeof width === "number") out.width = width;
  if (typeof height === "number") out.height = height;
  if (typeof rotation === "number") out.rotation = rotation;
  return Object.keys(out).length ? out : undefined;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class MiroClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Miro answers `{ status, code, message, type, context }` — the `code` is
      // a stable machine string and `context` names the offending field, so the
      // whole body is surfaced.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Miro ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Miro's **cursor** pagination — used by the board-item collections,
   * which answer `{ data, total, size, cursor, limit, links }` and omit
   * `cursor` on the last page.
   */
  async requestAllCursor<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let cursor: string | undefined;
    const pageSize = 50;
    while (items.length < wantTotal) {
      const page = await this.request<{ data?: T[]; cursor?: string }>(path, {
        ...options,
        query: { ...options.query, limit: pageSize, cursor },
      });
      const chunk = page?.data ?? [];
      items.push(...chunk);
      cursor = page?.cursor;
      if (!cursor || chunk.length === 0) break;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }

  /**
   * Follow Miro's **offset** pagination — a different contract from the cursor
   * one above, and the two are not interchangeable. `GET /v2/boards` and the
   * tag/board-member collections answer `{ data, total, size, offset, limit }`
   * and are walked by advancing `offset` until `size` runs out or `total` is
   * reached.
   */
  async requestAllOffset<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let offset = 0;
    const pageSize = 50;
    while (items.length < wantTotal) {
      const page = await this.request<{ data?: T[]; total?: number; size?: number }>(path, {
        ...options,
        query: { ...options.query, limit: pageSize, offset },
      });
      const chunk = page?.data ?? [];
      items.push(...chunk);
      if (chunk.length === 0) break;
      offset += chunk.length;
      if (typeof page?.total === "number" && offset >= page.total) break;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
