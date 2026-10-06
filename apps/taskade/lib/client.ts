import type { HookContext } from "@w6w/types";

/**
 * Taskade REST API v1 client.
 *
 * Verified 2026-10-06 against the OpenAPI 3.0.3 document the reference pages at
 * `docs.taskade.com/developers/comprehensive-api-guide/*` render from
 * (`servers: https://www.taskade.com/api/v1`, `info.title: Taskade Public API (v1)`, listed in
 * `docs.taskade.com/llms.txt`) and live unauthenticated probes of `www.taskade.com`.
 *
 * ## One host, one credential, an `ok` envelope
 *
 * Every call goes to `https://www.taskade.com/api/v1`. The token is stamped on by the Auth
 * `sign` hook. Successes are `{ "ok": true, "item": … }` or `{ "ok": true, "items": [ … ] }`;
 * failures are `{ "ok": false, "message", "code", "statusMessage" }` and `code` is the stable
 * part (an unsigned call answers HTTP 401 `UNAUTHORIZED`).
 *
 * ## Things that are not what they look like
 *
 * - The rate-limit headers are hyphenated `x-rate-limit-*` (not `x-ratelimit-*`), and
 *   `x-rate-limit-reset` is *seconds until reset* as a decimal (`23.727`), not an epoch.
 * - The other documented surface, the "Action API v2", is POST-per-operation RPC; this app is
 *   built on the resource-style v1 API which the docs call GA.
 * - Lists paginate two different ways: `limit` + `page` (members, agents, media, templates,
 *   conversations, my projects) and `limit` + `after`/`before` task-id cursors (tasks only).
 */
export const API_HOST = "www.taskade.com";
export const API_BASE = `https://${API_HOST}/api/v1`;

/** Percent-encode one path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/** Accept a list as a real array or as the comma-separated text a form field produces. */
export function strList(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  return items.map((s) => s.trim()).filter((s) => s !== "");
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

/** Drop `undefined` values so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""));
}

/** Taskade's failure envelope. */
export interface TaskadeErrorBody {
  ok?: boolean;
  message?: string;
  code?: string;
  statusMessage?: string;
}

/** The envelope when the parsed body is a failure envelope (`ok: false` plus a string code). */
export function vendorError(body: unknown): TaskadeErrorBody | undefined {
  if (body && typeof body === "object") {
    const b = body as TaskadeErrorBody;
    if (b.ok === false && typeof b.code === "string") return b;
  }
  return undefined;
}

/** One human line from a parsed error body: `CODE: message`. */
export function errorText(body: unknown, raw = ""): string {
  const e = vendorError(body);
  if (e) return [e.code, e.message].filter(Boolean).join(": ");
  return raw.trim().slice(0, 200);
}

export type Method = "GET" | "POST" | "PUT" | "DELETE";

export interface RequestOptions {
  query?: Query;
  body?: unknown;
}

export class TaskadeClient {
  constructor(private readonly ctx: HookContext) {}

  /** Issue a request and return the parsed JSON body (`{}` when empty). Throws on non-2xx. */
  async request<T = Record<string, unknown>>(
    method: Method,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${API_BASE}${path}${buildQuery(options.query)}`;
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
    if (!res.ok || vendorError(parsed)) {
      const reset = res.headers.get("x-rate-limit-reset");
      throw new Error(
        `Taskade ${method} ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}${
          res.status === 429 && reset ? ` (rate limit resets in ${reset}s)` : ""
        }`,
      );
    }
    return (parsed ?? {}) as T;
  }
}

export const project = (projectId: string) => `/projects/${seg(projectId)}`;
export const task = (projectId: string, taskId: string) =>
  `${project(projectId)}/tasks/${seg(taskId)}`;
