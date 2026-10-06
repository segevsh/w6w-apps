import type { HookContext } from "@w6w/types";

/**
 * Eden AI REST client (API V3).
 *
 * Every path, verb, field and enum in this app was verified on 2026-10-06 against Eden AI's own
 * OpenAPI document (`https://api.edenai.run/v3/docs/openapi.json`, `info.title` "Eden AI API V3",
 * `servers[0].url` `https://api.edenai.run`), the live feature catalog
 * (`GET /v3/info?include=schemas`, which is public) and live unauthenticated probes. V3 is the
 * current API: the documentation index links only `/v3/*` and the older `/v2` surface is no longer
 * documented, so nothing here targets it.
 *
 * ## Three families, one host, one credential
 *
 *  - OpenAI-compatible LLM routes (`/v3/chat/completions`, `/v3/responses`, `/v3/embeddings`,
 *    `/v3/moderations`, `/v3/images/*`, `/v3/audio/speech`, `/v3/videos`). The `model` is
 *    `provider/model` (`openai/gpt-4o`), or a bare model name to let Eden AI route the provider.
 *  - **Universal AI** (`/v3/universal-ai`, `/v3/universal-ai/async`) for every non-LLM "expert
 *    model". The `model` is `feature/subfeature/provider[/model]` and the feature's own fields
 *    are nested under `input`.
 *  - Gateway resources (`/v3/upload`, `/v3/universal-ai/async/{id}`, `/v3/info`).
 *
 * ## Errors
 *
 * Auth and routing failures answer `{"detail": "<string>"}` (`403 Not authenticated` with no
 * Authorization header, `401 Invalid token` for a wrong key, both measured live); validation
 * failures answer `422 {"detail": [{loc, msg, type}]}`. {@link formatEdenError} renders both.
 */

/** The one API origin the OpenAPI document declares (`servers[0].url`). */
export const API_BASE = "https://api.edenai.run";
export const API_PREFIX = "/v3";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** Drop keys the caller left unset. `false` and `0` survive - both are meaningful. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as Array<keyof T>) {
    const v = obj[k];
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma- or newline-separated list param into trimmed, non-empty items. */
export function list(v: string | string[] | undefined | null): string[] {
  if (v === undefined || v === null) return [];
  const raw = Array.isArray(v) ? v : v.split(/[,\n]/);
  return raw.map((s) => String(s).trim()).filter(Boolean);
}

/** Keep an error message readable - a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}... (${text.length} bytes, truncated)`;
}

/** Accept a JSON param given as an object/array already, or as a JSON string. */
export function parseJson<T = unknown>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** The vendor's own message out of an error body, whichever of its shapes it arrived in. */
export function errorDetail(raw: string): string | undefined {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const b = body as {
    detail?: unknown;
    message?: unknown;
    error?: { message?: unknown; code?: unknown } | string;
  } | null;
  if (!b || typeof b !== "object") return undefined;
  if (typeof b.detail === "string") return b.detail;
  if (Array.isArray(b.detail)) {
    return b.detail.map((d: { loc?: unknown[]; msg?: string }) =>
      `${(d.loc ?? []).filter((p) => p !== "body").join(".")}: ${d.msg ?? ""}`.trim()
    ).join("; ");
  }
  if (typeof b.message === "string") return b.message;
  if (typeof b.error === "string") return b.error;
  if (b.error && typeof b.error.message === "string") return b.error.message;
  return undefined;
}

export function formatEdenError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const detail = errorDetail(raw);
  return truncate(`Eden AI ${status} for ${method} ${path}: ${detail ?? (raw || "(empty body)")}`);
}

export class EdenClient {
  constructor(private ctx: HookContext) {}

  /** JSON in, parsed JSON out. A 204 or empty body returns `{}`. */
  async json<T = Record<string, unknown>>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Eden AI answered ${res.status} for ${path} with a body that is not JSON: ${
          truncate(text, 200)
        }`,
      );
    }
  }

  /** The raw `Response`, for binary endpoints (text-to-speech). */
  async raw(path: string, options: RequestOptions = {}): Promise<Response> {
    return await this.send(path, options);
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
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
    // No credential here: the runtime routes this through the Auth `sign` hook.
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatEdenError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
