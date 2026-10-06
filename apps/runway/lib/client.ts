import type { HookContext } from "@w6w/types";

/**
 * Runway developer API. Verified 2026-10-06 against the vendor's OpenAPI 3.1 document
 * (`docs.dev.runwayml.com/openapi.json`, `servers: https://api.dev.runwayml.com`), its
 * `ai-context.md` primer and live unauthenticated probes of `api.dev.runwayml.com`.
 *
 * ## One host, one credential, one required header
 *
 * Every call goes to `https://api.dev.runwayml.com`. The API secret is sent as
 * `Authorization: Bearer key_...` by the Auth `sign` hook; nothing here sees it. Every
 * request must also carry `X-Runway-Version: 2024-11-06` (the OpenAPI declares it a `const`
 * on every operation; the docs say a request without it fails), which this client adds.
 *
 * ## Generation is asynchronous
 *
 * A generation endpoint answers `{ id }` — a task id, not a result. The result is read with
 * `GET /v1/tasks/{id}` (status PENDING / THROTTLED / RUNNING / SUCCEEDED / FAILED /
 * CANCELLED). Content-moderation refusals are a FAILED task, not an HTTP error.
 *
 * ## Errors
 *
 * 4xx/5xx bodies are `{ "error": "<human text>", "docUrl": "...", ... }` — `error` is a
 * string, not an object.
 */
export const API_HOST = "api.dev.runwayml.com";
export const API_BASE = `https://${API_HOST}`;
export const API_VERSION = "2024-11-06";

type Scalar = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, Scalar>;
  body?: unknown;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

/** The vendor's `error` message out of a JSON error body, when there is one. */
export function vendorMessage(raw: unknown): string | undefined {
  if (raw && typeof raw === "object") {
    const err = (raw as { error?: unknown }).error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      const msg = (err as { message?: unknown }).message;
      if (typeof msg === "string") return msg;
    }
  }
  return undefined;
}

export function formatError(
  status: number,
  method: string,
  path: string,
  body: unknown,
  raw: string,
): string {
  const text = vendorMessage(body) ?? raw.trim();
  const issues = body && typeof body === "object" && "issues" in body
    ? ` (${truncate(JSON.stringify((body as { issues: unknown }).issues), 400)})`
    : "";
  const hint = status === 401
    ? " — the API secret was rejected; create a key in the Runway Developer Portal"
    : status === 429
    ? " — rate limit reached; retry with backoff (a THROTTLED task is queued, not rejected)"
    : status === 502 || status === 503 || status === 504
    ? " — Runway is shedding load; safe to retry with backoff"
    : "";
  return truncate(`Runway ${status} for ${method} ${path}: ${text}${issues}${hint}`, 1000);
}

export interface ApiResult {
  status: number;
  /** Parsed JSON body (undefined for an empty 204). */
  data: unknown;
}

export class RunwayError extends Error {
  constructor(message: string, public httpStatus: number) {
    super(message);
    this.name = "RunwayError";
  }
}

export class RunwayClient {
  constructor(private ctx: HookContext) {}

  async request(path: string, options: RequestOptions = {}): Promise<ApiResult> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const method = options.method ?? (options.body !== undefined ? "POST" : "GET");
    const headers: Record<string, string> = {
      accept: "application/json",
      "x-runway-version": API_VERSION,
    };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    // No credential here: the Auth `sign` hook adds the bearer header.
    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    let body: unknown = text || undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch { /* non-JSON */ }
    if (!res.ok) {
      throw new RunwayError(
        formatError(res.status, method, url.pathname, body, typeof body === "string" ? body : ""),
        res.status,
      );
    }
    return { status: res.status, data: body };
  }
}

/** Drop `undefined`/`null`/empty-string members. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** A required, trimmed string input. */
export function need(value: unknown, name: string): string {
  const v = String(value ?? "").trim();
  if (!v) throw new Error(`${name} is required`);
  return v;
}

/**
 * A JSON-typed input: an object/array passes through, a string is parsed. Returns
 * undefined for an empty value so it drops out of the body.
 */
export function jsonInput(value: unknown, name: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

/** `extra` must be a JSON object; its members are merged into the request body. */
export function extraFields(value: unknown): Record<string, unknown> {
  const parsed = jsonInput(value, "extra");
  if (parsed === undefined) return {};
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("extra must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

/** A media input: a URL / runway:// URI / data URI string, or JSON when it starts with `[`/`{`. */
export function mediaInput(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const v = value.trim();
  if (!v) return undefined;
  if (v.startsWith("[") || v.startsWith("{")) return jsonInput(v, "media input");
  return v;
}
