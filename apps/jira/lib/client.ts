import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * REST API v3 is the current Jira Cloud API. Its big difference from v2 is that
 * rich-text fields (description, comment bodies) are Atlassian Document Format
 * objects rather than wiki-markup strings — see `adf()`.
 */
export const API_PATH = "/rest/api/3";

/**
 * Jira Cloud is reachable two ways, and which one applies depends on how the
 * Connection was made:
 *
 *   - **API token** — the site's own host, `acme.atlassian.net`. The site name
 *     is an Auth field, recorded on the connection's `display`.
 *   - **OAuth 2.0 (3LO)** — a shared gateway, `api.atlassian.com/ex/jira/{cloudId}`.
 *     The cloud id is resolved from `/oauth/token/accessible-resources` in
 *     `afterConnect` and recorded the same way.
 *
 * Both hosts are on the egress allowlist; `*.atlassian.net` covers the first
 * because no manifest can enumerate customer sites.
 */
export function baseFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { site?: string; cloudId?: string };
  if (display.cloudId) return `https://api.atlassian.com/ex/jira/${display.cloudId}${API_PATH}`;
  if (display.site) return `https://${display.site}.atlassian.net${API_PATH}`;
  throw new Error(
    "Jira connection has neither a site nor a cloud id — reconnect so one can be recorded.",
  );
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

/**
 * Wrap plain text in a minimal Atlassian Document Format document.
 *
 * API v3 rejects a bare string for `description` and comment bodies — it wants
 * ADF. Users type prose, so each paragraph (split on blank lines) becomes an
 * ADF paragraph node. Anyone needing full ADF can pass an object instead, which
 * is forwarded untouched.
 */
export function adf(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") return value as Record<string, unknown>;
  const text = String(value);
  const paragraphs = text.split(/\n{2,}/).map((block) => ({
    type: "paragraph",
    content: block === "" ? [] : [{ type: "text", text: block }],
  }));
  return { type: "doc", version: 1, content: paragraphs };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class JiraClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseFromConnection(ctx.connection);
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
      // Jira returns { errorMessages: [...], errors: { field: "..." } } — both
      // matter, and the field-level one is usually the actionable part.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Jira ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
