import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.spotify.com/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a partial body doesn't send explicit nulls. */
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
 * Spotify IDs and URIs are interchangeable in every path this app calls
 * (`spotify:track:4iV5W9uYEdYUVa79Axb7Rh` or the bare `4iV5W9uYEdYUVa79Axb7Rh`).
 * Accept either so a value copied straight from the app or from another
 * action's output works without the caller stripping the prefix by hand.
 */
export function extractId(value: string): string {
  const parts = value.split(":");
  return parts.length === 3 && parts[0] === "spotify" ? parts[2] : value;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class SpotifyClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(compact(options.body));
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Spotify returns { error: { status, message } } — surface it, it is
      // the difference between "bad token" and "playlist not found".
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Spotify ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
