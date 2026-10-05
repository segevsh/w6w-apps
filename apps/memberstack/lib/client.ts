import type { HookContext } from "@w6w/types";

/**
 * Memberstack Admin REST API client.
 *
 * Every path, verb, parameter and response shape here was read from Memberstack's own
 * Admin REST API pages (`developers.memberstack.com/admin-rest-api/*`, markdown versions,
 * fetched 2026-10-05: quick-start, member-actions, verification, data-tables) and the
 * error envelope was confirmed with live unauthenticated / invalid-key probes against
 * `admin.memberstack.com` the same day.
 *
 * ## One host, two path families
 *
 * Members live at `/members…`; Data Tables live under `/v2/data-tables…` ("all Data Tables
 * endpoints use the `/v2` API version"). There is no regional host.
 *
 * ## Errors
 *
 * Every error is `{ "code": "...", "message": "..." }`. For most errors `code` is the
 * literal `generic-message`, so the HTTP status plus `message` is what is actionable. The
 * specific codes that exist are `validation/invalid-secret-key`, `validation/invalid-json`,
 * `invalid-email`, `plan-not-found` and `INVALID_TOKEN`.
 *
 * Do not decide "is the key valid" from the status: a *malformed* key answers 400 and a
 * well-formed unknown key answers 401, both with `validation/invalid-secret-key` (measured
 * live). {@link isInvalidKey} reads the body code.
 */

export const API_BASE = "https://admin.memberstack.com";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

export interface MemberstackErrorBody {
  code?: string;
  message?: string;
}

export class MemberstackError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | undefined,
  ) {
    super(message);
    this.name = "MemberstackError";
  }
}

/** True when the body says the secret key itself was rejected. */
export function isInvalidKey(body: MemberstackErrorBody | null | undefined): boolean {
  return body?.code === "validation/invalid-secret-key";
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Drop keys the caller left unset; `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export function formatMemberstackError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: MemberstackErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as MemberstackErrorBody;
  } catch { /* not JSON */ }
  const head = `Memberstack ${status} for ${method} ${path}`;
  if (!parsed || (!parsed.message && !parsed.code)) {
    return truncate(raw ? `${head}: ${raw}` : head, 1000);
  }
  const code = parsed.code && parsed.code !== "generic-message" ? ` (${parsed.code})` : "";
  return truncate(`${head} — ${parsed.message ?? "no message"}${code}`, 1000);
}

export class MemberstackClient {
  constructor(private ctx: HookContext) {}

  /** Parse a JSON response body; an empty body (e.g. add-plan's bare 200) is `undefined`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Like {@link json}, but a 4xx whose body carries `expectCode` is returned as data
   * instead of thrown — used by `verify-token`, where `INVALID_TOKEN` is an answer.
   */
  async jsonOrCode<T = unknown>(
    path: string,
    options: RequestOptions,
    expectCode: string,
  ): Promise<{ ok: true; body: T } | { ok: false; body: MemberstackErrorBody }> {
    const res = await this.raw(path, options);
    const text = await res.text().catch(() => "");
    if (res.ok) return { ok: true, body: (text ? JSON.parse(text) : undefined) as T };
    let parsed: MemberstackErrorBody | null = null;
    try {
      parsed = JSON.parse(text) as MemberstackErrorBody;
    } catch { /* fall through */ }
    if (parsed?.code === expectCode) return { ok: false, body: parsed };
    throw new MemberstackError(
      formatMemberstackError(res.status, options.method ?? "GET", path, text),
      res.status,
      parsed?.code,
    );
  }

  private buildUrl(path: string, query: RequestOptions["query"]): URL {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    return url;
  }

  private raw(path: string, options: RequestOptions): Promise<Response> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    return this.ctx.fetch(url.toString(), init);
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const res = await this.raw(path, options);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      let code: string | undefined;
      try {
        code = (JSON.parse(detail) as MemberstackErrorBody).code;
      } catch { /* not JSON */ }
      throw new MemberstackError(
        formatMemberstackError(res.status, options.method ?? "GET", path, detail),
        res.status,
        code,
      );
    }
    return res;
  }
}
