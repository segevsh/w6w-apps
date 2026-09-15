import type { HookContext } from "@w6w/types";

/**
 * Mindee Platform API v2 (`api-v2.mindee.net`) REST client.
 *
 * Everything in this module was verified on 2026-09-15 against Mindee's own
 * machine-readable OpenAPI 3.1 document (`api-v2.mindee.net/openapi.json`,
 * linked from `docs.mindee.com/integrations/api-reference`, `info.version`
 * `2.0.0`), the official `mindee-api-python` SDK source
 * (`github.com/mindee/mindee-api-python`, `mindee/v2/mindee_http/mindee_api_v2.py`
 * and `mindee/v2/client.py`), and live probes against `api-v2.mindee.net`.
 * Nothing here came from a third-party integration directory.
 *
 * ## The wire auth format is NOT what the OpenAPI security scheme implies
 *
 * The spec declares `APIKeyHeader: { type: "apiKey", in: "header", name:
 * "Authorization" }`, which says nothing about whether the value carries a
 * `Bearer ` prefix. Mindee's own Python SDK sets
 * `headers["Authorization"] = api_key` **verbatim** — no scheme prefix — and a
 * live probe confirms it: sending `Authorization: Bearer md_...` answers
 * `401-009 "Organization ID is required for JWT authentication. Do not
 * include \`Bearer \` if using an API key."` Mindee's own error-handling docs
 * repeat this explicitly: "API keys are not JWTs: do not include `Bearer` in
 * your `Authentication` header." Getting this wrong is the single most likely
 * way a hand-rolled Mindee integration breaks, since every other API in this
 * pack that uses a bearer-shaped header expects the prefix.
 *
 * ## Every inference is asynchronous, and enqueue answers 202 with a Job, not a result
 *
 * `POST /v2/products/{product}/enqueue` never returns extracted data. It
 * returns a `Job` (id, status, `pollingUrl`, `resultUrl` once ready). A
 * workflow either polls `GET /v2/jobs/{job_id}` until `status` is
 * `Processed`/`Failed`, or configures a webhook on the model (webhook
 * *management* has no API — it is configured on the Mindee Platform UI per
 * model; the API only lets a caller reference existing webhook IDs by
 * `webhook_ids`). The Job's own `id` is also the id every product's
 * `results/{inference_id}` route expects — confirmed by the SDK's
 * `enqueue_and_get_result`, which polls `get_job(enqueue_response.job.id)`
 * and the public `Client.get_result(response_type, inference_id)` taking that
 * same value.
 *
 * ## Errors are RFC 9457 problem details, not vendor-specific envelopes
 *
 * Every 4xx/5xx body is `{status, title, detail, code, errors: [{pointer,
 * detail}]}`. `code` is the stable machine identifier
 * (`401-001` invalid key, `401-008` missing credentials, `401-009` Bearer
 * misuse, `422-...` validation) and is what Mindee support asks for, so it is
 * surfaced verbatim rather than flattened into a bare HTTP status.
 */

export const API_BASE = "https://api-v2.mindee.net";

export interface MindeeErrorItem {
  pointer?: string | null;
  detail: string;
}

/** RFC 9457 problem-details body every Mindee 4xx/5xx answers with. */
export interface MindeeErrorBody {
  status?: number;
  title?: string;
  detail?: string;
  code?: string;
  errors?: MindeeErrorItem[];
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Sent as `multipart/form-data`. */
  form?: FormData;
  /** Serialized as JSON with `content-type: application/json`. */
  json?: unknown;
  accept?: string;
}

/** Keep an error message readable — a validation body can carry many `errors`. */
export function truncate(text: string, max = 900): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Mindee's RFC 9457 error body into one actionable line.
 *
 * `code` is kept because Mindee's own error-handling doc is written against
 * it (`401-001` invalid key vs `401-008` missing credential vs `401-009`
 * Bearer-prefix misuse are three different fixes, and all three are a bare
 * 401 without it), and `errors[].pointer` names exactly which field failed
 * validation on a 422 rather than leaving that to the caller to guess.
 */
export function formatMindeeError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: MindeeErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as MindeeErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.detail) return `Mindee ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Mindee ${status}${parsed.code ? ` ${parsed.code}` : ""} ${
      parsed.title ?? "error"
    } for ${method} ${path}`,
    parsed.detail,
    parsed.errors?.length
      ? parsed.errors.map((e) => `${e.pointer ?? "(body)"}: ${e.detail}`).join("; ")
      : undefined,
    status === 429
      ? "Mindee rate-limits per organization (200 enqueue/min, 1200 poll/min); retry with backoff"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(" — "), 1200);
}

export class MindeeClient {
  constructor(private ctx: HookContext) {}

  /** Parse the JSON body. Every successful Mindee response is JSON. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: options.accept ?? "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers, redirect: "manual" };
    if (options.form) {
      // Content-type (with the multipart boundary) is set by the runtime from
      // the FormData body — setting it here would drop the boundary.
      init.body = options.form;
    } else if (options.json !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.json);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatMindeeError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}

/** Decode a base64 (optionally data-URL-prefixed) string into raw bytes. */
export function base64ToBytes(input: string): ArrayBuffer {
  const cleaned = input.includes(",") ? input.split(",", 2)[1] : input;
  const bin = atob(cleaned);
  const buffer = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buffer;
}

/**
 * Accept a `json`-type param as either a parsed value or the string a user
 * typed — the host hands a `json` param through in whichever shape it
 * arrived, so both are handled here rather than at each call site.
 */
export function asOptionalJsonValue<T = unknown>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * The inverse: a `json`-type param destined for a field the vendor expects as
 * a JSON *string* (e.g. a multipart text part), whether it arrived as a
 * parsed object or as text.
 */
export function asJsonText(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") {
    try {
      JSON.parse(value);
    } catch {
      throw new Error(`${label} is not valid JSON`);
    }
    return value;
  }
  return JSON.stringify(value);
}

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
