import type { HookContext } from "@w6w/types";

export const API_HOST = "api.encharge.io";
export const INGEST_HOST = "ingest.encharge.io";
export const API_BASE = `https://${API_HOST}/v1`;
export const INGEST_URL = `https://${INGEST_HOST}/v1/`;

/** Percent-encode one path segment. */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id));
}

/**
 * Accept a JSON value either as the real thing or as the JSON text a form field produces.
 * Anything that does not parse passes through untouched so the vendor, not this app, rejects it.
 */
export function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/** Query pairs, not a record: Encharge's person selector repeats `people[i][field]` keys. */
export type QueryPairs = Array<[string, string | number | boolean | undefined | null]>;

/** Build `?a=1&b=2`, skipping unset, null and empty values. Brackets in keys are encoded. */
export function buildQuery(pairs: QueryPairs | undefined): string {
  if (!pairs) return "";
  const params = new URLSearchParams();
  for (const [key, value] of pairs) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/**
 * The vendor's error text. The REST API answers
 * `{"error": {"message", "errorCode"?, "markdown", "traceId"?, "stack"?}}` (the `stack` and
 * `markdown` members are never surfaced); the Ingest API answers `{"error": "<text>"}`.
 */
export function errorText(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const e = (body as Record<string, unknown>).error;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const msg = (e as Record<string, unknown>).message;
    if (typeof msg === "string") return msg;
  }
  return undefined;
}

/** The vendor's numeric error code, when the REST envelope carries one. */
export function errorCode(body: unknown): number | undefined {
  if (!body || typeof body !== "object") return undefined;
  const e = (body as Record<string, unknown>).error;
  if (e && typeof e === "object") {
    const code = (e as Record<string, unknown>).errorCode;
    if (typeof code === "number") return code;
  }
  return undefined;
}

export interface RequestOptions {
  query?: QueryPairs;
  body?: unknown;
}

/**
 * Thin client over `https://api.encharge.io/v1` and the Ingest API. Credentials are never
 * handled here: the runtime routes every `ctx.fetch` through the Auth `sign` hook, which stamps
 * `X-Encharge-Token` (the account API key for the REST host, the write key for the ingest host).
 */
export class EnchargeClient {
  constructor(private readonly ctx: HookContext) {}

  async request(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<Record<string, unknown>> {
    return await this.send(method, `${API_BASE}${path}${buildQuery(options.query)}`, options.body);
  }

  /** POST one event to the Ingest API (a different host, authenticated by the write key). */
  async ingest(body: unknown): Promise<Record<string, unknown>> {
    return await this.send("POST", INGEST_URL, body);
  }

  private async send(
    method: string,
    url: string,
    body: unknown,
  ): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const res = await this.ctx.fetch(url, init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }

    if (!res.ok) {
      const where = new URL(url).pathname;
      const detail = errorText(parsed) ??
        (parsed === undefined ? text.trim().slice(0, 200) : "") ?? "";
      throw new Error(
        `Encharge ${method} ${where} failed: HTTP ${res.status}${
          detail || res.statusText ? ` — ${detail || res.statusText}` : ""
        }`,
      );
    }
    // 201/202/204 answers carry no body; hand back an object either way.
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return parsed === undefined ? { ok: true } : { result: parsed };
  }
}
