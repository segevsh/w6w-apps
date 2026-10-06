import type { HookContext } from "@w6w/types";

/**
 * Thin client for the Cloze API (`api.cloze.com`).
 *
 * Verified on 2026-10-06 against Cloze's own OpenAPI document
 * (`developer.cloze.com/cloze-openapi.json`, version 2026.9) and unsigned probes.
 *
 *  1. **Errors are `{errorcode, message}`.** `errorcode: 0` is success on every response; any
 *     other number is a failure even if the HTTP status were 200, so {@link call} checks both.
 *     A bearer credential the gateway cannot resolve answers a different shape,
 *     `{"message": "Invalid token: access token is invalid"}` with no `errorcode`.
 *  2. **Writes return no record.** `create`/`update` answer `{errorcode, message}` only.
 *  3. **Timeline is a two-step read.** A timeline call returns `{key, changed}` references;
 *     `messages/get` turns those into message bodies.
 */
export const API_BASE = "https://api.cloze.com";

export class ClozeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errorcode: number | undefined,
    readonly vendorMessage: string | undefined,
  ) {
    super(message);
    this.name = "ClozeError";
  }
}

export type Query = Record<string, unknown>;

/** A required id/key: trimmed, and never empty (an empty `id` would query nothing useful). */
export function requireStr(name: string, value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`${name} is required`);
  return s;
}

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/** `{message}` from an error body, if there is one. */
export function errorMessage(body: unknown): string | undefined {
  const m = (body as { message?: unknown } | null)?.message;
  return typeof m === "string" && m ? m : undefined;
}

export function errorCode(body: unknown): number | undefined {
  const c = (body as { errorcode?: unknown } | null)?.errorcode;
  return typeof c === "number" ? c : undefined;
}

/** Drop unset (`undefined`/`null`/empty-string) inputs so a blank field is never sent. */
export function pick(input: Record<string, unknown>, keys: readonly string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = input[k];
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** A `json` param may arrive parsed or as the raw text the user typed. */
export function parseJsonField(name: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

/** A list param: an array, a JSON array in text, or comma-separated text. */
export function parseList(name: string, value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  const t = value.trim();
  if (!t) return [];
  if (t.startsWith("[") || t.startsWith("{")) {
    const parsed = parseJsonField(name, t);
    if (!Array.isArray(parsed)) throw new Error(`${name} must be a JSON array`);
    return parsed;
  }
  return t.split(",").map((s) => s.trim()).filter(Boolean);
}

export interface RequestOptions {
  query?: Query;
  body?: Record<string, unknown>;
}

/** One request; returns the parsed body without its `errorcode` envelope field. */
export async function call(
  ctx: HookContext,
  method: "GET" | "POST" | "DELETE",
  path: string,
  opts: RequestOptions = {},
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { accept: "application/json" };
  const init: RequestInit = { method, headers };
  if (opts.body) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  const res = await ctx.fetch(buildUrl(path, opts.query), init);
  const text = await res.text();
  let json: Record<string, unknown> = {};
  if (text.trim()) {
    try {
      const parsed = JSON.parse(text);
      json = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : { result: parsed };
    } catch {
      json = { message: text.slice(0, 200) };
    }
  }
  const code = errorCode(json);
  if (!res.ok || (code !== undefined && code !== 0)) {
    const vendor = errorMessage(json);
    throw new ClozeError(
      `Cloze ${method} ${path} failed (${res.status}${code ? `, errorcode ${code}` : ""})` +
        `${vendor ? `: ${vendor}` : ""}`,
      res.status,
      code,
      vendor,
    );
  }
  const { errorcode: _ignored, ...rest } = json;
  return rest;
}
