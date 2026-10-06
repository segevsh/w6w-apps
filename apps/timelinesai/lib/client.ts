/**
 * Shared HTTP client for the **TimelinesAI Public API**.
 *
 * ## Where the contract came from
 *
 * Every path, verb and field here was read on 2026-10-06 from TimelinesAI's own reference at
 * `https://timelines.ai/docs` (Mintlify; indexed by `https://timelines.ai/docs/llms.txt`). Each
 * reference page embeds a complete OpenAPI 3.0.3 document ("Timelines Public API" v1.3.0) — append
 * `.md` to any page URL to read it. There is no standalone `openapi.json` (every guessed path is a
 * 404). The old `timelines.ai/api-documentation` and `docs.timelines.ai` hosts are dead.
 *
 * ## Base URL
 *
 * `https://app.timelines.ai/integrations/api` — the PRODUCT host, not `timelines.ai` (the
 * marketing site) and not `api.timelines.ai` (does not resolve).
 *
 * ## Auth
 *
 * `Authorization: Bearer <token>`. No header is set here: the auth `sign` hook is the only code in
 * this app that touches the credential.
 *
 * ## One error envelope
 *
 * Success is `{ "status": "ok", "data": … }`; every failure is
 * `{ "status": "error", "message": "…", "error_code": "<stable code>" }` (measured live on a missing
 * and a rejected token). Both are 401 — only `error_code` (`missing_credentials` vs
 * `invalid_token`) tells them apart. `formatError` reads the code, never the status alone.
 */
import type { HookContext } from "@w6w/types";

export const API_HOST = "app.timelines.ai";
export const API_URL = `https://${API_HOST}/integrations/api`;

/** The documented envelope. Everything is optional because a CDN error page has none of it. */
export interface TimelinesBody {
  status?: string;
  data?: unknown;
  message?: string;
  error_code?: string;
  errors?: Array<{ fields?: unknown[]; msg?: string }>;
}

/** Render a vendor error for a human. Never echoes the request, query string or any header. */
export function formatError(status: number, body: TimelinesBody | undefined): string {
  if (!body || typeof body !== "object") return `HTTP ${status}`;
  const code = typeof body.error_code === "string" ? ` (${body.error_code})` : "";
  const parts: string[] = [];
  if (typeof body.message === "string" && body.message) parts.push(body.message);
  if (Array.isArray(body.errors)) {
    for (const e of body.errors.slice(0, 5)) {
      if (e && typeof e.msg === "string") {
        const where = Array.isArray(e.fields) ? `${e.fields.join(".")}: ` : "";
        parts.push(`${where}${e.msg}`);
      }
    }
  }
  return parts.length ? `HTTP ${status}${code}: ${parts.join("; ")}` : `HTTP ${status}${code}`;
}

/** True when a parsed body says it failed, whatever the status code was. */
export function bodyFailed(body: TimelinesBody | undefined): boolean {
  return !!body && typeof body === "object" && body.status === "error";
}

/** Encode one path segment so an id can never smuggle a `/`. Refuses an empty value. */
export function seg(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error("a required path value is empty");
  return encodeURIComponent(s);
}

/** Drop keys the caller left unset so an optional never overwrites a vendor default. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === "") continue;
    out[key as keyof T] = value as T[keyof T];
  }
  return out;
}

/** A list param arrives as an array, or as a comma/newline-separated string. */
export function toList(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  const raw = Array.isArray(value) ? value : String(value).split(/[\n,]/);
  return raw.map((v) => String(v).trim()).filter((v) => v.length > 0);
}

/** A list-valued filter the API wants as one comma-separated query string. */
export function csv(value: unknown): string | undefined {
  const list = toList(value);
  return list.length ? list.join(",") : undefined;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * Deliberately sets no auth header: the runtime routes every request through the auth `sign`
 * hook, and that hook is the only code in this app that sees the token.
 */
export class TimelinesClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();

    let parsed: TimelinesBody | undefined;
    if (text) {
      try {
        parsed = JSON.parse(text) as TimelinesBody;
      } catch {
        parsed = undefined;
      }
    }

    if (!res.ok || bodyFailed(parsed)) {
      throw new Error(
        `TimelinesAI ${method} ${url.pathname} returned ${formatError(res.status, parsed)}`,
      );
    }

    if (!text) return { status: "ok" } as T;
    return (parsed ?? { raw: text }) as T;
  }

  get<T = unknown>(path: string, query?: RequestOptions["query"]): Promise<T> {
    return this.request<T>(path, { query });
  }

  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body: body ?? {} });
  }

  put<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "PUT", body });
  }

  patch<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body });
  }

  delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }
}
