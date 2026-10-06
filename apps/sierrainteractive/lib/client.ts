import type { HookContext } from "@w6w/types";

/**
 * Thin client over Sierra Interactive's API (`https://api.sierrainteractivedev.com`), the
 * Swagger 2.0 document at `/swagger/docs/v1` (fetched 2026-10-06). That document describes the
 * `/zapier/*` controller, which is the whole public surface Sierra documents.
 *
 * The credential is never handled here: every request goes through `ctx.fetch` and the Auth
 * `sign` hook stamps the `Sierra-User-ApiKey` header on it.
 *
 * Sierra reports failure as `{"success": false, "errorMessage": "..."}`. A rejected key is an
 * HTTP **400** (not 401), and an unknown path is a JSON 404 with the same envelope, so errors
 * are classified from the body, never from the status line alone.
 */

export const API_BASE = "https://api.sierrainteractivedev.com";

export interface SierraEnvelope {
  success?: boolean;
  errorMessage?: string;
  [key: string]: unknown;
}

/** Drop undefined / null / empty-string so an unset form field is never sent. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

export function encodeId(id: string | number): string {
  const s = String(id ?? "").trim();
  if (!s) throw new Error("a lead id, email address or phone number is required");
  return encodeURIComponent(s);
}

/** `"a, b"` or `["a","b"]` -> `["a","b"]`; empty -> undefined. */
export function toList(v: string | string[] | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function isEnvelope(body: unknown): body is SierraEnvelope {
  return typeof body === "object" && body !== null && !Array.isArray(body) &&
    ("success" in body || "errorMessage" in body);
}

/** The human-readable failure for a response, or undefined when it is a success. */
export function failureOf(status: number, text: string): string | undefined {
  const body = parseJson(text);
  if (isEnvelope(body) && body.success === false) {
    return body.errorMessage || "request failed without an errorMessage";
  }
  if (status >= 400) {
    if (isEnvelope(body) && body.errorMessage) return body.errorMessage;
    return text.trim().startsWith("<") ? "non-JSON error page" : text.slice(0, 200) || "no body";
  }
  return undefined;
}

export class SierraClient {
  constructor(private ctx: HookContext) {}

  async request(
    method: "GET" | "POST" | "PUT",
    path: string,
    body?: unknown,
  ): Promise<{ data: unknown }> {
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    const res = await this.ctx.fetch(`${API_BASE}${path}`, init);
    const text = await res.text().catch(() => "");
    const failure = failureOf(res.status, text);
    if (failure !== undefined) {
      throw new Error(truncate(`Sierra ${res.status} for ${method} ${path}: ${failure}`, 1000));
    }
    return { data: text ? (parseJson(text) ?? text) : null };
  }

  get(path: string) {
    return this.request("GET", path);
  }
}
