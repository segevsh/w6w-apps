import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * LaunchDarkly's REST API v2 — verified against the OpenAPI 3.0.3 document
 * LaunchDarkly serves from the API's own host
 * (`https://app.launchdarkly.com/api/v2/openapi.json`, 2.95MB, 250 paths,
 * fetched 2026-08-18).
 *
 * **Two hosts, and they are separate worlds.** The document's `servers` block
 * lists `app.launchdarkly.com` and `app.launchdarkly.us` — the second is
 * LaunchDarkly's US-government (FedRAMP) instance. An account exists in one or
 * the other, never both, and a key from one is simply unknown to the other, so
 * the instance is a connection field rather than something guessed.
 */
export const HOSTS = {
  commercial: "https://app.launchdarkly.com",
  federal: "https://app.launchdarkly.us",
} as const;

export type LaunchDarklyInstance = keyof typeof HOSTS;

export const API_PATH = "/api/v2";

/**
 * The content type that turns a body into a **semantic patch**.
 *
 * This is the single most important detail in the app. LaunchDarkly's `PATCH`
 * endpoints accept three different formats and tell them apart by the
 * `Content-Type` alone:
 *
 *   - plain `application/json` → **JSON Patch** (RFC 6902), an array of
 *     `{op, path, value}`;
 *   - `application/merge-patch+json` → JSON merge patch;
 *   - `application/json; domain-model=launchdarkly.semanticpatch` →
 *     **semantic patch**, `{instructions: [{kind: "turnFlagOn"}]}`.
 *
 * Send an instructions body without that parameter and LaunchDarkly reads it as
 * a JSON Patch, which it is not — so the call fails with a complaint about the
 * patch document rather than anything about the header. Every semantic write in
 * this app goes through `semanticPatch`, so no action can forget it.
 */
export const SEMANTIC_PATCH_CONTENT_TYPE =
  "application/json; domain-model=launchdarkly.semanticpatch";

/** Public (redacted-safe) connection metadata. */
export interface LaunchDarklyConnectionDisplay {
  /** Which LaunchDarkly instance this account lives in. */
  instance?: LaunchDarklyInstance;
  /** The default project key, when one was chosen. */
  projectKey?: string;
  /** The default environment key, when one was chosen. */
  environmentKey?: string;
}

export function resolveHost(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as LaunchDarklyConnectionDisplay;
  const instance = String(display.instance ?? "commercial") as LaunchDarklyInstance;
  return HOSTS[instance] ?? HOSTS.commercial;
}

/**
 * Resolve the project key.
 *
 * Almost every path in this API is scoped to a project, and most accounts have
 * one that everything lives in — so it belongs on the connection, with an
 * override per action.
 */
export function resolveProject(
  connection: RedactedConnection | undefined,
  override?: unknown,
): string {
  const explicit = String(override ?? "").trim();
  if (explicit) return explicit;
  const display = (connection?.display ?? {}) as LaunchDarklyConnectionDisplay;
  const fromConnection = display.projectKey?.trim();
  if (fromConnection) return fromConnection;
  throw new Error(
    "no project — set a default on the connection or pass `projectKey` on the action",
  );
}

/**
 * Resolve the environment key.
 *
 * Kept separate from the project because the failure modes differ: a wrong
 * project is a 404, while a wrong **environment** is the quiet one — a flag
 * exists in every environment of its project, so toggling `production` when
 * you meant `staging` succeeds perfectly.
 */
export function resolveEnvironment(
  connection: RedactedConnection | undefined,
  override?: unknown,
): string {
  const explicit = String(override ?? "").trim();
  if (explicit) return explicit;
  const display = (connection?.display ?? {}) as LaunchDarklyConnectionDisplay;
  const fromConnection = display.environmentKey?.trim();
  if (fromConnection) return fromConnection;
  throw new Error(
    "no environment — set a default on the connection or pass `environmentKey` on the action",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
  /** Overrides `application/json` — used only for the semantic patch type. */
  contentType?: string;
}

/** Drop keys the caller left unset so a patch does not clear untouched fields. */
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
 * Rate-limit headers, read from a live response.
 *
 * LaunchDarkly documents three families, all resetting every ten seconds, and
 * all described **in prose only** — the OpenAPI document declares none of them
 * as a response header on any operation, so nothing here can promise they
 * arrive:
 *
 *   - **Global**, per account and shared by every token on it:
 *     `X-Ratelimit-Global-Limit` / `X-Ratelimit-Global-Remaining`.
 *   - **Route-level**, per URL-pattern-and-verb:
 *     `X-Ratelimit-Route-Limit` / `X-Ratelimit-Route-Remaining`.
 *   - `X-Ratelimit-Reset`, epoch **milliseconds**, shared by both.
 *
 * The distinction matters for a health check: only the global pair says
 * anything about the account, and the route pair describes whichever endpoint
 * happened to be called. LaunchDarkly's own advice is *"rely on the headers
 * described below, rather than hardcoding the current limits"* — so this reads
 * what is actually there and reports nothing rather than guessing when it is
 * absent.
 */
export interface RateLimit {
  globalLimit?: number;
  globalRemaining?: number;
  routeLimit?: number;
  routeRemaining?: number;
  /** Epoch **milliseconds**, not seconds. */
  resetAt?: number;
}

export function readRateLimit(headers: Headers): RateLimit {
  const num = (name: string): number | undefined => {
    const raw = headers.get(name);
    if (raw === null || raw.trim() === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    globalLimit: num("x-ratelimit-global-limit"),
    globalRemaining: num("x-ratelimit-global-remaining"),
    routeLimit: num("x-ratelimit-route-limit"),
    routeRemaining: num("x-ratelimit-route-remaining"),
    resetAt: num("x-ratelimit-reset"),
  };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class LaunchDarklyClient {
  readonly host: string;

  constructor(private ctx: HookContext) {
    this.host = resolveHost(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.host}${API_PATH}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) url.searchParams.set(k, v.join(","));
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = options.contentType ?? "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // LaunchDarkly's envelope is `{code, message}` — `code` is the
      // machine-readable half (`unauthorized`, `not_found`, `invalid_request`)
      // and the message carries which instruction or field was rejected.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `LaunchDarkly ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Send a **semantic patch** — instructions rather than a diff.
   *
   * The content type is what makes it one; see `SEMANTIC_PATCH_CONTENT_TYPE`.
   * Every write in this app that changes a flag or a segment goes through here.
   */
  async semanticPatch<T = unknown>(
    path: string,
    instructions: unknown[],
    extra: Record<string, unknown> = {},
  ): Promise<T> {
    if (!Array.isArray(instructions) || instructions.length === 0) {
      throw new Error("a semantic patch needs at least one instruction");
    }
    return await this.request<T>(path, {
      method: "PATCH",
      contentType: SEMANTIC_PATCH_CONTENT_TYPE,
      body: { ...extra, instructions },
    });
  }

  /**
   * Follow LaunchDarkly's `limit`/`offset` paging, collecting `items`.
   *
   * The list endpoints answer `{items: [...], totalCount, _links}` — an
   * envelope, unlike the bare arrays several other APIs in this pack use.
   * `totalCount` is present but not relied on: a short page is the end.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let offset = 0;
    while (items.length < wantTotal) {
      const limit = Math.min(100, Math.max(1, wantTotal - items.length));
      const page = await this.request<{ items?: T[] }>(path, {
        ...options,
        query: { ...options.query, limit, offset },
      });
      const chunk = page?.items ?? [];
      items.push(...chunk);
      if (chunk.length < limit) break;
      offset += chunk.length;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
