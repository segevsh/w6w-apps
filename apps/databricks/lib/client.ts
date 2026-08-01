import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Every Databricks workspace has its own full host URL (e.g.
 * `https://adb-1234567890123456.7.azuredatabricks.net`), stored on the
 * Connection rather than as an Action param — the same pattern Zendesk uses
 * for its per-account subdomain. `afterConnect` records it on the redacted
 * `display`; the client reads it from there.
 */
export function workspaceUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { workspaceUrl?: string };
  if (display.workspaceUrl) return display.workspaceUrl;
  throw new Error(
    "Databricks connection has no workspaceUrl — reconnect the workspace so it can be recorded.",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class DatabricksClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = workspaceUrlFromConnection(ctx.connection).replace(/\/+$/, "");
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
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
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Databricks ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
