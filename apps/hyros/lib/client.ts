import type { HookContext } from "@w6w/types";

/** Hyros API root. Every documented path is `/api/v1.0/...` beneath it. */
export const API_BASE = "https://api.hyros.com/v1";
export const API_PREFIX = "/api/v1.0";

/** The envelope every Hyros answer carries (`result` is data on reads, `"OK"` on writes). */
export interface HyrosEnvelope {
  request_id?: string;
  result?: unknown;
  message?: unknown;
  nextPageId?: string;
}

export class HyrosError extends Error {
  constructor(message: string, readonly status: number, readonly messages: string[] = []) {
    super(message);
    this.name = "HyrosError";
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

/**
 * Split a comma-separated form value into its non-empty trimmed parts.
 * Hyros' list filters (`ids`, `emails`, `productTags`, ...) take arrays.
 */
export function csv(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

/**
 * Hyros documents its array query filters as `"a","b"` — each value
 * double-quoted, comma-joined (`emails="a@x.io","b@x.io"`). Returns undefined
 * for an empty list so the parameter is omitted entirely.
 */
export function quotedList(value: unknown): string | undefined {
  const parts = csv(value);
  return parts.length ? parts.map((p) => `"${p.replace(/"/g, "")}"`).join(",") : undefined;
}

/** Drop undefined/null/empty-string/empty-array entries from a body or query object. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** The standard pagination pair every Hyros list endpoint shares. */
export function pageQuery(input: { pageSize?: number; pageId?: string }): Query {
  return { pageSize: input.pageSize, pageId: input.pageId };
}

export function buildUrl(path: string, query: Query = {}): string {
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `${API_BASE}${API_PREFIX}${path}${qs ? `?${qs}` : ""}`;
}

export class HyrosClient {
  constructor(private readonly ctx: HookContext) {}

  /**
   * Make a call and return the parsed envelope. Throws {@link HyrosError} for any
   * non-2xx status AND for a 2xx whose body says `"result":"ERROR"` — judged from
   * the body, because the same "Api key not valid" message is documented under both
   * 400 and 401, and a missing key answers a bare text/plain `Unauthorized`.
   */
  async call(
    method: string,
    path: string,
    opts: { query?: Query; body?: unknown } = {},
  ): Promise<HyrosEnvelope> {
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(buildUrl(path, opts.query), init);
    const text = await res.text();
    let json: HyrosEnvelope | null = null;
    try {
      json = text ? JSON.parse(text) as HyrosEnvelope : null;
    } catch {
      json = null;
    }
    const failed = !res.ok || json?.result === "ERROR";
    if (failed) {
      const messages = Array.isArray(json?.message)
        ? (json!.message as unknown[]).map(String)
        : typeof json?.message === "string"
        ? [json.message]
        : text && !json
        ? [text.slice(0, 200)]
        : [];
      throw new HyrosError(
        `Hyros ${method} ${path} failed (${res.status})${
          messages.length ? `: ${messages.join("; ")}` : ""
        }`,
        res.status,
        messages,
      );
    }
    return json ?? {};
  }

  /** A write: Hyros answers `{request_id, result: "OK"}`. */
  async write(
    method: string,
    path: string,
    opts: { query?: Query; body?: unknown } = {},
  ): Promise<{ requestId?: string; result: unknown }> {
    const env = await this.call(method, path, opts);
    return { requestId: env.request_id, result: env.result };
  }

  /** A paged or plain read: `{result, nextPageId?, request_id}`. */
  async read(
    path: string,
    query: Query = {},
  ): Promise<{ result: unknown; nextPageId: string | null; requestId?: string }> {
    const env = await this.call("GET", path, { query });
    return {
      result: env.result ?? null,
      nextPageId: env.nextPageId ?? null,
      requestId: env.request_id,
    };
  }
}
