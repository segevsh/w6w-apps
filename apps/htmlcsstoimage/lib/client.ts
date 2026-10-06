import type { HookContext } from "@w6w/types";

/**
 * HTML/CSS to Image REST client.
 *
 * Verified 2026-10-06 against the vendor's OpenAPI 3.1 document
 * (`htmlcsstoimage.com/openapi/v1.json`, 22 paths in the REST surface this app uses a
 * subset of) and `docs.htmlcsstoimage.com`, plus unauthenticated live probes of `hcti.io`.
 *
 * ## One host, one prefix
 *
 * The document declares exactly one server, `https://hcti.io`; every path starts `/v1`.
 *
 * ## The OpenAPI document omits the templated-image route
 *
 * `POST /v1/image` in the spec accepts a `Templated Image Request` body that carries
 * `template_values` but **no `template_id`** — there is nowhere in the schema to say which
 * template. The docs ("Creating an image with a template") are the source of truth:
 * `POST /v1/image/{template_id}` (latest version) or
 * `POST /v1/image/{template_id}/{template_version}` (pinned). The `image-create-template`
 * action uses that documented route.
 *
 * ## Error body
 *
 * Every failure is `{"success":false,"error":"Unauthorized","validationErrors":null,
 * "referenceId":null,"message":"API Key is Invalid","statusCode":401}`. `message` is the
 * vendor's prose and `validationErrors` is `[{path, message}]` on a 400. A 403 with a valid
 * key means the key lacks the permission the route needs (`images:create`, `templates:read`,
 * `usage:read`, …) and the message names it; a 402 is a plan/credit limit.
 */
export const API_BASE = "https://hcti.io";
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

interface HctiErrorBody {
  error?: string;
  message?: string;
  statusCode?: number | string;
  referenceId?: string | null;
  validationErrors?: Array<{ path?: string; message?: string }> | null;
}

/** Drop keys the caller left unset. `false` and `0` survive: both are meaningful. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/** Path-escape a caller-supplied id. */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn the vendor's error body into one actionable line, keeping the vendor's own
 * `error`/`message` and any per-field validation messages.
 */
export function formatHctiError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: HctiErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as HctiErrorBody;
  } catch { /* not JSON */ }
  if (!parsed || typeof parsed !== "object" || (!parsed.error && !parsed.message)) {
    return `HTML/CSS to Image ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  const fields = (parsed.validationErrors ?? [])
    .map((v) => `${v.path ?? "?"}: ${v.message ?? ""}`)
    .join("; ");
  const hint = status === 402
    ? "plan or image-credit limit reached"
    : status === 403
    ? "the API key may lack the permission this route needs, or the plan does not include it"
    : undefined;
  return truncate(
    [
      `HTML/CSS to Image ${status} ${parsed.error ?? "error"} for ${method} ${path}`,
      parsed.message,
      fields || undefined,
      hint,
      parsed.referenceId ? `ref ${parsed.referenceId}` : undefined,
    ].filter(Boolean).join(": "),
    1000,
  );
}

export class HctiClient {
  constructor(private ctx: HookContext) {}

  /** Parse the JSON body. An empty body (202/204) yields `undefined`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for the delete routes that answer with no body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    await res.text().catch(() => "");
    return res.status;
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
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatHctiError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
