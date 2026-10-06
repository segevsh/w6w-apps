import type { HookContext } from "@w6w/types";

/**
 * The one host this app talks to. Every Anchor API path in the vendor's
 * OpenAPI documents is relative to it — `/me`, `/contacts`, `/v2/agreements`,
 * `/billing/{id}/submit` — with the version in the PATH of only the newer
 * routes, not in the host. Verified against https://docs.sayanchor.com on
 * 2026-10-06 and by live probes of `api.sayanchor.com` the same day.
 */
export const API_BASE = "https://api.sayanchor.com";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
  /**
   * Name to give a bare-string 200 body. `POST /contacts` answers with the new
   * id as a bare string, not an object, and an Action must return an object.
   */
  wrap?: string;
}

/** Drop unset values so they never reach the wire as `?search=`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Accept an object, or a JSON string typed into a `json` param field. */
export function asJson<T>(value: unknown, label: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required`);
  }
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export function buildQuery(query: Record<string, QueryValue> | undefined): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    // Anchor filters take comma-separated lists (`status=active,completed`).
    const value = Array.isArray(v) ? v.join(",") : String(v);
    if (value === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(value)}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/**
 * Anchor has THREE error body shapes, measured live on 2026-10-06:
 *
 *  - no `Authorization` header: `401 text/plain` body `Unauthorized`;
 *  - a bearer that is not a key: `401 application/json`
 *    `{"status":401,"error":"token contains an invalid number of segments"}`;
 *  - a well-formed but unknown key: `401 {"status":401,"error":"INVALID_API_KEY"}`.
 *
 * So the vendor's code lives in `error` when the body is JSON, and is the whole
 * body when it is not. This returns whichever one is there.
 */
export function errorCode(body: unknown): string | undefined {
  if (typeof body === "string") return body.trim() || undefined;
  if (body && typeof body === "object") {
    const e = (body as { error?: unknown; message?: unknown }).error ??
      (body as { message?: unknown }).message;
    if (typeof e === "string") return e;
    if (e && typeof e === "object") {
      const m = (e as { message?: unknown }).message;
      if (typeof m === "string") return m;
    }
  }
  return undefined;
}

export async function readBody(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (text === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class AnchorError extends Error {
  constructor(public status: number, public code: string | undefined, message: string) {
    super(message);
    this.name = "AnchorError";
  }
}

export class AnchorClient {
  constructor(private readonly ctx: HookContext) {}

  /**
   * `ctx.fetch` only. No `Authorization` and no `Anchor-User-Email` here — both
   * are stamped by the Auth `sign` hook, which is the only code handed the key.
   */
  async request(method: string, path: string, opts: RequestOptions = {}): Promise<unknown> {
    const hasBody = opts.body !== undefined;
    const headers: Record<string, string> = { accept: "application/json" };
    if (hasBody) headers["content-type"] = "application/json";

    const res = await this.ctx.fetch(`${API_BASE}${path}${buildQuery(opts.query)}`, {
      method,
      headers,
      body: hasBody ? JSON.stringify(opts.body) : undefined,
    });
    const body = await readBody(res);

    if (!res.ok) {
      const code = errorCode(body);
      throw new AnchorError(
        res.status,
        code,
        `Anchor ${method} ${path} failed: ${res.status}${code ? ` ${code}` : ""}`,
      );
    }
    if (body === undefined || body === "") return { ok: true };
    if (typeof body === "string" || typeof body !== "object" || Array.isArray(body)) {
      return { [opts.wrap ?? "value"]: body };
    }
    return body;
  }
}
