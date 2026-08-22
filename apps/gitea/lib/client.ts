import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Gitea's REST API — verified against the Swagger 2.0 document a Gitea
 * instance serves from its own root (`/swagger.v1.json`; fetched from
 * `gitea.com` 2026-08-18, engine 1.27.0-dev, 340 paths), whose `basePath` is
 * `/api/v1`.
 *
 * **There is no vendor host.** Gitea is self-hosted by design — `gitea.com` is
 * one instance among many, and most are private. So the base URL is a
 * connection field and the app's egress allowlist is `["*"]`, the posture this
 * pack already uses for `mattermost`, `ghost`, `grafana` and `jenkins`. It is
 * deliberately wide, and it is the price of an app whose server address only
 * the operator knows.
 *
 * Because the document ships *with the instance*, it also describes exactly the
 * version in front of you — which is the nicest property a self-hosted API can
 * have, and why `instance` health reports the version it found.
 */
export const API_PATH = "/api/v1";

/** Public (redacted-safe) connection metadata. */
export interface GiteaConnectionDisplay {
  /** The instance origin, e.g. `https://git.example.com`. */
  baseUrl?: string;
  /** The default owner (user or organization), when one was chosen. */
  owner?: string;
  /** The account the token belongs to. */
  login?: string;
}

/**
 * Normalise a user-typed instance URL into a bare origin.
 *
 * People paste all of `git.example.com`, `https://git.example.com/`,
 * `https://git.example.com/api/v1` and a link to a repository. All mean the
 * same server.
 *
 * The `/api/v1` strip is not cosmetic: Gitea's own curl examples end in
 * `/api/v1/user`, so a pasted `…/api/v1` is entirely plausible, and silently
 * producing `/api/v1/api/v1/user` would be a baffling 404.
 *
 * A missing scheme defaults to `https`: a token in flight deserves TLS, and
 * producing `http://` from a bare hostname would silently downgrade the
 * credential's transport. An operator on a private network can still type
 * `http://` explicitly.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Gitea URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Gitea URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Gitea URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the instance origin off the redacted Connection. Never touches the credential. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as GiteaConnectionDisplay;
  if (display.baseUrl) return normalizeBaseUrl(display.baseUrl);
  throw new Error(
    "this Gitea connection records no instance URL — reconnect it so the URL can be stored",
  );
}

/**
 * Resolve `owner/repo`.
 *
 * Gitea addresses almost everything as a pair, and the owner is the half that
 * repeats — so it can live on the connection while the repository is named per
 * action. A single `owner/repo` string in the repository field also works,
 * because that is how people write it everywhere else.
 */
export function resolveRepo(
  connection: RedactedConnection | undefined,
  repo: unknown,
  ownerOverride?: unknown,
): { owner: string; repo: string } {
  const raw = String(repo ?? "").trim();
  if (!raw) throw new Error("`repo` is required");

  if (raw.includes("/")) {
    const [owner, name, ...rest] = raw.split("/");
    if (rest.length > 0 || !owner || !name) {
      throw new Error(`\`repo\` should be "name" or "owner/name", not "${raw}"`);
    }
    return { owner, repo: name };
  }

  const explicit = String(ownerOverride ?? "").trim();
  if (explicit) return { owner: explicit, repo: raw };
  const display = (connection?.display ?? {}) as GiteaConnectionDisplay;
  const fromConnection = display.owner?.trim();
  if (fromConnection) return { owner: fromConnection, repo: raw };
  throw new Error(
    `no owner for "${raw}" — write it as "owner/${raw}", pass \`owner\`, or set a default ` +
      "owner on the connection",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset so a PATCH does not clear untouched fields. */
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
 * Gitea sends and receives file contents as **base64**, and the sandbox has no
 * Node `Buffer` — so the two conversions are here, built on the platform's
 * `atob`/`btoa` with UTF-8 handled explicitly.
 *
 * Doing it naively is the trap: `btoa` throws on any character above U+00FF, so
 * a commit message in Japanese or a file with an em dash fails with
 * "InvalidCharacterError" rather than anything about encoding.
 */
export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeBase64(encoded: string): string {
  // Gitea wraps long base64 in newlines; atob rejects them.
  const binary = atob(String(encoded).replace(/\s+/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class GiteaClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${API_PATH}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Gitea's error envelope is `{message, url}` — the `url` points at the
      // API documentation for the endpoint, which is more useful than it
      // sounds when an instance is running an older version than you expect.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Gitea ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Gitea's `page`/`limit` paging.
   *
   * Every list endpoint answers a **bare array** — there is no envelope and no
   * total in the body; Gitea puts the count in an `X-Total-Count` header. So a
   * page shorter than the one asked for is the end-of-collection signal, and
   * `page` is **1-based**: starting at 0 returns page 1 again and duplicates it.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    while (items.length < wantTotal) {
      const limit = Math.min(50, Math.max(1, wantTotal - items.length));
      const chunk = await this.request<T[]>(path, {
        ...options,
        query: { ...options.query, page, limit },
      });
      const rows = Array.isArray(chunk) ? chunk : [];
      items.push(...rows);
      if (rows.length < limit) break;
      page += 1;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
