import type { HookContext } from "@w6w/types";

/**
 * WorkFlowy public API v1 client.
 *
 * Verified on 2026-10-06 against the vendor's own API reference
 * (`https://workflowy.com/api-reference/`, also served as markdown) plus live
 * probes of `workflowy.com/api/v1`. Nothing here came from a third-party
 * integration directory.
 *
 * ## Shapes that differ per endpoint
 *
 *  - **Create** answers `{"item_id"}` only — no node. Fetch it with `node-get`.
 *  - **Update / delete / move / complete / uncomplete** answer `{"status":"ok"}`.
 *  - **Retrieve** answers `{"node": {…}}`; **list** and **export** answer
 *    `{"nodes": […]}`, **unordered** — sort by `priority`.
 *  - **Mirror** answers `{"item_id", "origin_id"}`.
 *
 * ## Errors
 *
 * A rejected key answers HTTP 401 with `{"errors": "Invalid Credentials, try
 * again."}` — note the plural key and the bare string. The status code is only a
 * hint; {@link formatError} reads the body first.
 *
 * ## Rate limits
 *
 * The reference documents exactly one: `GET /api/v1/nodes-export` is limited to
 * 1 request per minute. No other limit and no rate-limit response header is
 * documented (none was observed on a live 401).
 */

export const API_BASE = "https://workflowy.com";
export const API_PREFIX = "/api/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
}

export interface WorkflowyNode {
  id: string;
  parent_id: string | null;
  name: string;
  note: string | null;
  priority: number;
  completed: boolean;
  data?: { layoutMode?: string };
  createdAt?: number;
  modifiedAt?: number;
  completedAt?: number | null;
}

/** Pull the vendor's message out of whatever shape an error body takes. */
export function formatError(status: number, body: unknown, fallback = ""): string {
  let detail = "";
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    const e = o.errors ?? o.error ?? o.detail ?? o.message;
    if (typeof e === "string") detail = e;
    else if (e !== undefined) detail = JSON.stringify(e);
  } else if (typeof body === "string") detail = body.slice(0, 200);
  return `Workflowy API error ${status}${detail || fallback ? `: ${detail || fallback}` : ""}`;
}

/** Drop undefined/null/empty-string values so optional params are omitted from the wire. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/** Path segment for a node id, short id, or calendar/target key. */
export function seg(id: unknown): string {
  const s = String(id ?? "").trim();
  if (!s) throw new Error("id is required");
  return encodeURIComponent(s);
}

export class WorkflowyClient {
  constructor(private readonly ctx: HookContext) {}

  async request<T = Record<string, unknown>>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: opts.method ?? "GET", headers };
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!res.ok) throw new Error(formatError(res.status, parsed, res.statusText));
    return (parsed ?? {}) as T;
  }
}

/** Nodes come back unordered; siblings sort by ascending `priority`. */
export function sortByPriority<T extends { priority?: number }>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
}
