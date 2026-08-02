import type { HookContext } from "@w6w/types";

/**
 * Postmark's REST API — `https://api.postmarkapp.com`. Verified against the
 * official developer docs (`postmarkapp.com/developer/api/overview`, fetched
 * 2026-08-02).
 *
 * Every request carries the credential as an `X-Postmark-Server-Token` header
 * (server-level privileges — sending, message search, bounces, templates,
 * stats). Postmark also has a separate `X-Postmark-Account-Token` for
 * account-level endpoints (creating/listing *servers*, domains, sender
 * signatures) — this app deliberately does not implement those. Every action
 * below is something a single server's automation legitimately needs; the
 * account-level surface manages Postmark itself (multiple servers, billing,
 * domain verification) and is an operator/admin concern, not a workflow
 * step. See `auth/api-key.ts` and README.md "Auth" for the full rationale.
 *
 * Error responses are `{ ErrorCode: number, Message: string }` on both 422
 * (validation) and 401 (auth) — confirmed against the same docs: "Whenever
 * the Postmark server detects an input error it will return an HTTP 422
 * status code along with a JSON object containing error details."
 */
export const API_URL = "https://api.postmarkapp.com";

export interface PostmarkErrorBody {
  ErrorCode?: number;
  Message?: string;
}

function formatError(status: number, body: PostmarkErrorBody | undefined): string {
  if (body?.Message) return `${status} (ErrorCode ${body.ErrorCode ?? "?"}): ${body.Message}`;
  return `HTTP ${status}`;
}

/**
 * Call the Postmark REST API and return the parsed JSON body, throwing a
 * descriptive `Error` on a non-2xx response. `path` is relative to
 * {@link API_URL} (e.g. `/email`). No `Authorization`/token header is set
 * here — the auth `sign` hook injects `X-Postmark-Server-Token`.
 */
export async function postmarkFetch<T>(
  ctx: HookContext,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await ctx.fetch(`${API_URL}${path}`, {
    ...init,
    headers: { accept: "application/json", ...(init?.headers as Record<string, string> ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    let body: PostmarkErrorBody | undefined;
    try {
      body = JSON.parse(text) as PostmarkErrorBody;
    } catch {
      // Non-JSON error body — formatError falls back to a bare status.
    }
    throw new Error(
      `Postmark ${init?.method ?? "GET"} ${path} returned ${formatError(res.status, body)}`,
    );
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** POST/PUT with a JSON body — sets `content-type` and serializes `payload`. */
export function postmarkJsonInit(method: "POST" | "PUT", payload: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  };
}

/** Drop `undefined`/empty-string values so optional params don't overwrite server defaults. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === "") continue;
    out[key as keyof T] = value as T[keyof T];
  }
  return out;
}
