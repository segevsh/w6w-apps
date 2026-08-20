import type { HookContext } from "@w6w/types";

/**
 * Replicate's HTTP API — verified against the OpenAPI 3.1 document Replicate
 * serves from the API's own host (`https://api.replicate.com/openapi.json`,
 * fetched 2026-08-18), whose `servers` block states
 * `https://api.replicate.com/v1`.
 */
export const API_URL = "https://api.replicate.com/v1";

/**
 * The header that turns an asynchronous API into a synchronous one.
 *
 * A prediction is a background job: `POST /predictions` normally answers
 * immediately with `status: "starting"` and no output, and you poll
 * `prediction-get` or wait for a webhook. Replicate's `Prefer: wait` header
 * asks it to hold the connection open instead — up to 60 seconds — and return a
 * finished prediction.
 *
 * **`wait` is a request, not a promise.** Replicate's own wording: *"The
 * request will wait up to 60 seconds for the model to run. If this time is
 * exceeded the prediction will be returned in a `starting` state and need to be
 * retrieved using the `predictions.get` endpoint."* So a workflow that sets it
 * and reads `output` still has to handle the case where the model was slow —
 * which is the single most likely way to ship a broken Replicate integration.
 */
export function preferWait(seconds: unknown): string | undefined {
  if (seconds === undefined || seconds === null || seconds === "" || seconds === false) {
    return undefined;
  }
  if (seconds === true) return "wait";
  const n = Number(seconds);
  // 0 is the parameter's default and means "do not wait" — not an out-of-range
  // number of seconds.
  if (n === 0) return undefined;
  if (!Number.isFinite(n)) throw new Error("`waitSeconds` must be a number of seconds, 1 to 60");
  if (n < 1 || n > 60) {
    throw new Error(
      `\`waitSeconds\` must be between 1 and 60 — Replicate caps the wait (got ${n})`,
    );
  }
  return `wait=${Math.floor(n)}`;
}

/** The prediction states that mean the work is over, one way or another. */
export const TERMINAL_STATES = ["succeeded", "failed", "canceled"] as const;

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Extra request headers — `Prefer` and `Cancel-After` only. */
  headers?: Record<string, string>;
  /** Return the body as text rather than parsing it — the readme is Markdown. */
  raw?: boolean;
}

/** Drop keys the caller left unset. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
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
 * Split `owner/name` into its two halves.
 *
 * Every model path on Replicate is a pair, and people write it as one string
 * everywhere — including in Replicate's own URLs and its `version` identifiers
 * (`owner/name:versionid`). So the pair is accepted as written rather than as
 * two fields.
 */
export function splitModel(raw: unknown): { owner: string; name: string } {
  const text = String(raw ?? "").trim();
  if (!text) throw new Error("`model` is required, as `owner/name`");
  // A version identifier is `owner/name:version` — the colon part is not ours.
  const withoutVersion = text.split(":")[0];
  const [owner, name, ...rest] = withoutVersion.split("/");
  if (!owner || !name || rest.length > 0) {
    throw new Error(`\`model\` should be "owner/name", not "${text}"`);
  }
  return { owner, name };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class ReplicateClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      ...(options.headers ?? {}),
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Replicate answers RFC 7807 problem details — `{title, detail, status}`
      // — where `detail` is the sentence worth reading. The whole body is
      // surfaced because a bad model input puts the schema error there.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Replicate ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    // The readme endpoint answers Markdown; everything else answers JSON.
    if (options.raw) return text as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Replicate's **cursor** pagination.
   *
   * The list endpoints answer `{results: [...], next, previous}` where `next`
   * is a **complete URL**, not a token — so the walk follows it verbatim rather
   * than rebuilding a query. That is why this method exists instead of an
   * offset loop: reconstructing the cursor from parts is exactly the mistake
   * the absolute URL is there to prevent.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let page = await this.request<{ results?: T[]; next?: string | null }>(path, options);
    items.push(...(page?.results ?? []));

    while (items.length < wantTotal && page?.next) {
      const next = new URL(page.next);
      // Only the path and query travel; the host is the one already allowed.
      page = await this.request<{ results?: T[]; next?: string | null }>(
        `${next.pathname.replace(/^\/v1/, "")}${next.search}`,
        { headers: options.headers },
      );
      const chunk = page?.results ?? [];
      if (chunk.length === 0) break;
      items.push(...chunk);
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
