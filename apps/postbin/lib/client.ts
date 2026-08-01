import type { HookContext } from "@w6w/types";

/**
 * PostBin's only host, per its own API docs (postb.in/api) and n8n's
 * production PostBin node, which targets the same base URL.
 */
export const API_BASE = "https://www.postb.in";

export interface RequestOptions {
  method?: string;
}

/** Shape returned by both Create Bin and Get Bin. */
export interface Bin {
  binId: string;
  /** UTC timestamp (ms) the bin was created. */
  now: number;
  /** UTC timestamp (ms) the bin will be deleted — approx. 30 minutes after creation. */
  expires: number;
}

/** Shape of one request PostBin collected, returned by Get Request and Shift Request. */
export interface CollectedRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
  ip: string;
  binId: string;
  /** UTC timestamp (ms) the request was received. */
  inserted: number;
}

/**
 * Thin wrapper over `ctx.fetch` for PostBin's JSON API. PostBin needs no
 * credential at all — this App declares no Auth method, so there is nothing
 * for a `sign` hook to inject, and every request goes out unsigned.
 */
export async function postbinRequest<T = unknown>(
  ctx: HookContext,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const res = await ctx.fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: { accept: "application/json" },
  });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }

  if (!res.ok) {
    const msg = body && typeof body === "object" && "msg" in body
      ? String((body as { msg: unknown }).msg)
      : `HTTP ${res.status}`;
    throw new Error(`PostBin ${res.status} for ${options.method ?? "GET"} ${path}: ${msg}`);
  }

  return body as T;
}
