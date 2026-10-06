import type { HookContext } from "@w6w/types";

/**
 * Dixa API v1 REST client.
 *
 * Verified 2026-10-06 against Dixa's own OpenAPI 3.0 document
 * (`docs.dixa.io/_bundle/openapi/dixa-api/@v1/v1.yaml`) and unauthenticated probes against
 * `dev.dixa.io`.
 *
 * ## Shapes worth knowing
 *
 *  - One host, `dev.dixa.io`, version in the path (`/v1`). Auth is the RAW token in the
 *    `Authorization` header — no `Bearer` — and is stamped by the auth module's `sign`.
 *  - Successful bodies are wrapped: `{"data": …}`; lists add `{"meta": {"next": "<path>?pageKey=…"}}`
 *    where `meta.next` is a relative URL whose `pageKey` is opaque ("do not construct").
 *  - Pagination is `pageLimit` + `pageKey`, only where the spec documents them (agents, end users,
 *    an end user's conversations, search). Tags, queues, teams and custom attributes answer everything.
 *  - Errors are `{"message": "…"}`. API Gateway's own 401 is the same body, so a missing token and a
 *    wrong token are indistinguishable.
 *  - Conversation ids are int64 integers; every other id is a UUID.
 *  - Union request bodies carry a `_type` discriminator (`Email`, `Inbound`/`Outbound`, `Text`/
 *    `Html`/`Markdown`).
 *  - Close, reopen, claim, transfer and tag add/remove answer `204` with no body.
 */
export const API_BASE = "https://dev.dixa.io";
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Drop keys the caller left unset; `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a comma string or array into a trimmed list, or undefined when empty. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Path-escape a caller-supplied id so `/` or `?` cannot leave the segment. */
export function encodeId(id: unknown, label = "id"): string {
  const v = String(id ?? "").trim();
  if (!v) throw new Error(`${label} is required`);
  return encodeURIComponent(v);
}

/** A conversation id is an int64; refuse anything else before it reaches the path. */
export function conversationId(id: unknown): string {
  const v = String(id ?? "").trim();
  if (!/^[0-9]+$/.test(v)) throw new Error("conversationId must be a positive integer");
  return v;
}

/** Pull the opaque `pageKey` out of `meta.next` (a relative URL), or undefined on the last page. */
export function nextPageKey(meta: unknown): string | undefined {
  const next = (meta as { next?: unknown } | null | undefined)?.next;
  if (typeof next !== "string" || !next) return undefined;
  try {
    return new URL(next, API_BASE).searchParams.get("pageKey") ?? undefined;
  } catch {
    return undefined;
  }
}

/** One-line error from Dixa's `{message}` body, keeping the status for the caller. */
export function formatDixaError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let message: string | undefined;
  try {
    message = (JSON.parse(raw) as { message?: string })?.message;
  } catch { /* not JSON */ }
  const hint = status === 401
    ? " — Dixa returns the same 401 for a missing token, a wrong token and a token whose user may not do this"
    : "";
  return truncate(`Dixa ${status} for ${method} ${path}: ${message ?? truncate(raw)}${hint}`, 1000);
}

export class DixaClient {
  constructor(private ctx: HookContext) {}

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatDixaError(res.status, method, url.pathname, detail));
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
