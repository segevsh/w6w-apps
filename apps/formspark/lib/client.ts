import type { HookContext } from "@w6w/types";

/**
 * Formspark management API client.
 *
 * Everything here comes from Formspark's own OpenAPI 3.1 document
 * (`https://api.formspark.io/public/v1/openapi.json`, 37,463 bytes, fetched 2026-10-06) and the
 * API pages of `documentation.formspark.io`, plus live unauthenticated probes against
 * `api.formspark.io` the same day. Nothing came from a third-party integration directory.
 *
 * ## Base URL, auth
 *
 * `https://api.formspark.io/public/v1`; `Authorization: Bearer <token>` (`bearerAuth`, http /
 * bearer). This client never sets it: the runtime routes every request through the auth `sign`
 * hook, the only code handed the credential.
 *
 * ## Errors are `application/problem+json`
 *
 * RFC 9457 problem details: `{type, title, status, detail, code}` plus extension members
 * (`requiredScope` on `insufficient_scope`, `workspaceId` on `upgrade_required`, an `errors`
 * string array on `validation_error` and `template_invalid`). The docs say "Branch on `code`.
 * It is stable, while `detail` is written for a human and its wording can change", so
 * {@link FormsparkError} carries `code` and the thrown message leads with it.
 *
 * ## Pagination
 *
 * Every list answers `{data, hasMore, nextCursor}`. While `hasMore` is true, `nextCursor` goes
 * back as `startingAfter`. Cursors are opaque; `limit` is 1-100 and defaults to 25.
 *
 * ## No-body successes
 *
 * The three DELETEs answer `204`. {@link FormsparkClient.request} resolves `null` for them.
 */

export const API_BASE = "https://api.formspark.io/public/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Drop unset values; `false` and `0` are meaningful and kept. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Build `?a=1&b=2`, skipping unset values. */
export function queryString(query: Record<string, QueryValue> = {}): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(compact(query))) sp.append(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** A problem+json body, as far as we rely on it. */
export interface Problem {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  errors?: string[];
  requiredScope?: string;
  workspaceId?: string;
}

/** The vendor's stable error code from a problem body, if it is one. */
export function problemCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const c = (body as Problem).code;
  return typeof c === "string" && c ? c : undefined;
}

/** A non-2xx response, with the vendor's own code and extension members preserved. */
export class FormsparkError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    readonly problem: Problem | null,
    message: string,
  ) {
    super(message);
    this.name = "FormsparkError";
  }
}

function describe(status: number, problem: Problem | null, text: string, fallback: string) {
  const parts: string[] = [];
  if (problem?.detail) parts.push(problem.detail);
  if (Array.isArray(problem?.errors) && problem.errors.length) {
    parts.push(problem.errors.join("; "));
  }
  if (problem?.requiredScope) parts.push(`required scope: ${problem.requiredScope}`);
  if (problem?.workspaceId) parts.push(`workspace: ${problem.workspaceId}`);
  const code = problemCode(problem);
  const tail = parts.length ? parts.join(" — ") : (text ? text.slice(0, 300) : fallback);
  return `Formspark ${status}${code ? ` ${code}` : ""}${tail ? `: ${tail}` : ""}`;
}

/** Path-segment guard: an id must be present, and is URL-encoded. */
export function seg(value: string | undefined, label: string): string {
  const v = (value ?? "").trim();
  if (!v) throw new Error(`Formspark: ${label} is required`);
  return encodeURIComponent(v);
}

/** A required, trimmed value that travels in a body or query rather than a path. */
export function need(value: string | undefined, label: string): string {
  const v = (value ?? "").trim();
  if (!v) throw new Error(`Formspark: ${label} is required`);
  return v;
}

/** Thin client over `ctx.fetch`. It never sets `Authorization`. */
export class FormsparkClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(`${API_BASE}${path}${queryString(opts.query)}`, {
      method: opts.method ?? "GET",
      headers,
      body,
    });
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        if (res.ok) throw new Error(`Formspark ${res.status}: response was not JSON`);
      }
    }
    if (!res.ok) {
      const problem = parsed && typeof parsed === "object" ? parsed as Problem : null;
      throw new FormsparkError(
        res.status,
        problemCode(problem),
        problem,
        describe(res.status, problem, text, res.statusText),
      );
    }
    return parsed as T;
  }

  get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>(path, { query });
  }
}
