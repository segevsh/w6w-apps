import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Formsite addresses an account by two things, and both belong to the Connection:
 *
 *   - the **server** — `fs1`, `fs2`, … — which is the host prefix
 *     (`https://fs3.formsite.com/api/v2/…`). A manifest cannot enumerate the
 *     servers, so `w6w.network.allow` declares `*.formsite.com`.
 *   - the **user directory** — the account's path segment, the same one that
 *     appears in its form links.
 *
 * `afterConnect` records both on the connection's redacted `display`, which is
 * where this client reads them from — it never sees the credential.
 */
export interface FormsiteTarget {
  server: string;
  userDir: string;
}

export function targetFromConnection(connection: RedactedConnection | undefined): FormsiteTarget {
  const display = (connection?.display ?? {}) as { server?: string; userDir?: string };
  if (display.server && display.userDir) {
    return { server: display.server, userDir: display.userDir };
  }
  throw new Error(
    "Formsite connection has no server or user directory — reconnect the account so they can be recorded.",
  );
}

export function baseUrl(server: string): string {
  return `https://${server}.formsite.com/api/v2`;
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: string;
  query?: Query;
  body?: Record<string, unknown>;
}

export interface Page<T> {
  body: T;
  /** Pagination-* response headers, when the endpoint sends them. */
  pagination: { limit?: number; page?: number; lastPage?: number };
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class FormsiteClient {
  private base: string;
  private user: string;

  constructor(private ctx: HookContext) {
    const { server, userDir } = targetFromConnection(ctx.connection);
    this.base = baseUrl(server);
    this.user = encodeURIComponent(userDir);
  }

  /** `/{user_dir}{path}` — every documented action lives under the user directory. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return (await this.requestPage<T>(path, options)).body;
  }

  async requestPage<T = unknown>(path: string, options: RequestOptions = {}): Promise<Page<T>> {
    const url = new URL(`${this.base}/${this.user}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      // Formsite errors are `{ error: { message, status } }`.
      let detail = text;
      try {
        const parsed = JSON.parse(text) as { error?: { message?: string } };
        if (parsed.error?.message) detail = parsed.error.message;
      } catch { /* keep the raw body */ }
      throw new Error(
        `Formsite ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    return {
      body: (text ? JSON.parse(text) : {}) as T,
      pagination: {
        limit: num(res.headers.get("pagination-limit")),
        page: num(res.headers.get("pagination-page-current")),
        lastPage: num(res.headers.get("pagination-page-last")),
      },
    };
  }
}
