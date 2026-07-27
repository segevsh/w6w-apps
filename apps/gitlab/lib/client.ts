import type { HookContext } from "@w6w/types";

/** GitLab SaaS. Self-managed instances override this per-connection (see below). */
export const DEFAULT_BASE_URL = "https://gitlab.com";

/**
 * Public (redacted-safe) connection metadata this app publishes from its auth
 * `afterConnect` hooks onto `connection.display`, so action and health code can
 * compute the base URL without ever touching the credential.
 */
export interface GitLabConnectionDisplay {
  /** Instance root, e.g. `https://gitlab.com` or `https://gitlab.example.com`. */
  baseUrl?: string;
}

/**
 * Resolve the API v4 base from a root URL. GitLab's REST API lives at
 * `<root>/api/v4`; `root` is `https://gitlab.com` for SaaS or the customer's
 * own instance for self-managed. Blank/whitespace falls back to SaaS.
 */
export function resolveApiBase(root?: string): string {
  const trimmed = (root ?? "").trim();
  const base = (trimmed || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return `${base}/api/v4`;
}

/** The API base for a Connection, read from its redacted display metadata. */
export function apiBaseFromConnection(ctx: HookContext): string {
  const display = (ctx.connection?.display ?? {}) as GitLabConnectionDisplay;
  return resolveApiBase(display.baseUrl);
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a PUT doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * GitLab addresses a project by a URL-encoded id — either the numeric id
 * (`123`) or the namespaced path (`group/project`), where the `/` MUST be
 * percent-encoded to `%2F`. `encodeURIComponent` does both correctly: it leaves
 * a bare number untouched and turns `group/project` into `group%2Fproject`.
 */
export function projectPath(projectId: string): string {
  return encodeURIComponent(projectId);
}

/** Repository file paths are encoded whole, slashes included (`src/a.ts` → `src%2Fa.ts`). */
export function filePathSegment(filePath: string): string {
  return encodeURIComponent(filePath);
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the `PRIVATE-TOKEN` or
 * `Authorization` header — the runtime routes every request through the auth
 * `sign` hook, which injects the credential. The base URL is resolved from the
 * caller's Connection so the same code targets SaaS and self-managed instances.
 */
export class GitLabClient {
  private base: string;

  constructor(private ctx: HookContext, base?: string) {
    this.base = base ?? apiBaseFromConnection(ctx);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(compact(options.body));
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // GitLab returns `{ message: ... }` or `{ error: ... }` — surface it, it's
      // the difference between "bad token" and "tag_name is missing".
      const detail = await res.text().catch(() => "");
      throw new Error(
        `GitLab ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
