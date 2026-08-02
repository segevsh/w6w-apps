import type { HookContext } from "@w6w/types";

/**
 * Unlike Freshdesk/Zendesk, Help Scout has no per-account host — every
 * customer's Mailbox API lives at the same `api.helpscout.net/v2`, so there is
 * no domain/subdomain to resolve off the Connection. That is also why
 * `w6w.network.allow` names the bare host instead of a wildcard.
 */
export const API_BASE = "https://api.helpscout.net/v2";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown> | unknown[];
}

/** Drop keys the caller left unset so a POST/PATCH doesn't send nulls Help Scout will reject. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
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

/** The `Resource-ID` (+ optional `Location`) a `201 Created` carries instead of a body. */
export interface CreateResult {
  resourceId?: number;
  location?: string;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class HelpScoutClient {
  constructor(private ctx: HookContext) {}

  private buildUrl(path: string, query?: RequestOptions["query"]): URL {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    return url;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Help Scout returns { message, _embedded: { errors: [{ path, message }] } }
      // for validation failures — the body is where the actionable part is.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Help Scout ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    return res;
  }

  /** GET/PATCH/etc. calls that return a JSON body (or nothing, for a 204). */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Help Scout's `create` endpoints (`Create Conversation`, `Create Reply`,
   * `Create Note`, `Create Customer`) answer `201 Created` with an EMPTY body
   * — the new id rides the `Resource-ID` header instead (plus `Location` for
   * conversations and customers), so a caller doesn't have to re-fetch just
   * to learn what it created.
   */
  async create(path: string, body: RequestOptions["body"]): Promise<CreateResult> {
    const res = await this.send(path, { method: "POST", body });
    const resourceIdHeader = res.headers.get("resource-id");
    return {
      resourceId: resourceIdHeader ? Number(resourceIdHeader) : undefined,
      location: res.headers.get("location") ?? undefined,
    };
  }
}
