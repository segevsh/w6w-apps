import type { HookContext } from "@w6w/types";

/**
 * The CircleCI REST API v2 base. Verified against
 * https://circleci.com/docs/api/v2/ (the official reference), 2026-08-01.
 */
export const API_BASE = "https://circleci.com/api/v2";

/**
 * CircleCI's documented error body shape: `{ message }`. As with Netlify,
 * there is no envelope around a success response — a 2xx body is the
 * resource itself, so only the error path needs unwrapping.
 */
export interface CircleCiApiError {
  message?: string;
}

function formatError(status: number, body: CircleCiApiError | undefined): string {
  if (body?.message) return `${status}: ${body.message}`;
  return `HTTP ${status}`;
}

/**
 * Call the CircleCI REST API and return the parsed JSON body, throwing a
 * descriptive `Error` on a non-2xx response. `path` is relative to
 * {@link API_BASE} (e.g. `/me`).
 */
export async function circleciFetch<T>(
  ctx: HookContext,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await ctx.fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => undefined) as CircleCiApiError | undefined;
    throw new Error(`CircleCI API ${path} returned ${formatError(res.status, body)}`);
  }
  // Some endpoints (e.g. workflow cancel) return 200 or 202 with a small
  // `{ message }` body rather than the resource — still JSON, but guard
  // against an empty body the same way Netlify's client does.
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/**
 * Every project-scoped endpoint takes a `project-slug` in the form
 * `<vcs>/<org>/<repo>` — e.g. `gh/CircleCI-Public/api-preview-docs`. Unlike a
 * typical path parameter, CircleCI's own docs and examples embed it with its
 * slashes intact rather than percent-encoded
 * (`GET /project/gh/CircleCI-Public/api-preview-docs/pipeline`), so this only
 * trims and validates shape rather than calling `encodeURIComponent` on the
 * whole slug.
 */
export function requireProjectSlug(value: unknown): string {
  const slug = String(value ?? "").trim();
  if (!slug) throw new Error("`projectSlug` is required");
  if (slug.split("/").length !== 3) {
    throw new Error(
      "`projectSlug` must be in the form vcs-slug/org-name/repo-name, e.g. gh/org/repo",
    );
  }
  return slug;
}
