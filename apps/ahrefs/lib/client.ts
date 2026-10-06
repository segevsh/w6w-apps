import type { HookContext } from "@w6w/types";

/**
 * Ahrefs API v3 client.
 *
 * Verified 2026-10-06 against the OpenAPI document at `docs.ahrefs.com/openapi.json` (listed in
 * `docs.ahrefs.com/llms.txt`; `servers: https://api.ahrefs.com/v3`, security `http` bearer) and
 * live unauthenticated probes of `api.ahrefs.com`.
 *
 * ## One host, one bearer credential
 *
 * Every call goes to `https://api.ahrefs.com/v3/{tool}/{endpoint}`. The key is stamped on by the
 * Auth `sign` hook as `Authorization: Bearer <key>`. All data endpoints this app uses are `GET`
 * with query-string parameters; success bodies are `{ "<resource>": … }`, no envelope.
 *
 * ## Things that are not what they look like
 *
 * - Failures are a bare JSON **array** `["Error","Unauthorized"]` (measured), although the
 *   OpenAPI schema documents `{ "error": "…" }`; {@link errorText} reads both.
 * - A bad key is HTTP **401** `["Error","Unauthorized"]`, a missing one **403**
 *   `["Error","Forbidden"]`. 403 is also what a key without API access gets, so the verdict is
 *   read from the body, never the status alone.
 * - There is no offset/cursor: `limit` is the only paging control (default 1000).
 * - Cost is billed per request; `x-api-units-cost-total-actual` and `x-api-rows` come back on
 *   every response and are surfaced as `unitsCost` / `rows`.
 */
export const API_HOST = "api.ahrefs.com";
export const API_BASE = `https://${API_HOST}/v3`;

export type Query = Record<string, string | number | boolean | undefined | null>;

/** Build `?a=1&b=2`, skipping unset, null and empty values. */
export function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** Lower-case a country code the way Ahrefs expects (`us`). */
export function country(value: unknown): string | undefined {
  const s = String(value ?? "").trim().toLowerCase();
  return s === "" ? undefined : s;
}

/**
 * One human line from a parsed error body. Handles the measured array form
 * `["Error","Forbidden"]` and the documented `{ "error": "…" }` form.
 */
export function errorText(body: unknown, raw = ""): string {
  if (Array.isArray(body)) return body.map(String).join(": ");
  if (body && typeof body === "object") {
    const e = (body as { error?: unknown }).error;
    if (typeof e === "string" && e !== "") return e;
  }
  return raw.trim().slice(0, 200);
}

/** The vendor's error label (`Unauthorized`, `Forbidden`…) out of a parsed body, when it is one. */
export function errorLabel(body: unknown): string | undefined {
  if (Array.isArray(body) && body.length >= 2 && body[0] === "Error") return String(body[1]);
  if (body && typeof body === "object") {
    const e = (body as { error?: unknown }).error;
    if (typeof e === "string" && e !== "") return e;
  }
  return undefined;
}

const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export class AhrefsClient {
  constructor(private readonly ctx: HookContext) {}

  /** GET a path; returns the parsed body and the response headers. */
  async get<T = Record<string, unknown>>(
    path: string,
    query?: Query,
  ): Promise<{ data: T; headers: Headers }> {
    const res = await this.ctx.fetch(`${API_BASE}${path}${buildQuery(query)}`, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.trim() !== "") {
      try {
        parsed = JSON.parse(text);
      } catch { /* non-JSON body: reported below if the request failed */ }
    }
    if (!res.ok) {
      throw new Error(
        `Ahrefs GET ${path} failed: HTTP ${res.status} — ${errorText(parsed, text)}`,
      );
    }
    return { data: (parsed ?? {}) as T, headers: res.headers };
  }

  /** GET and return the body, plus the units the call cost and the rows it returned. */
  async report(path: string, query?: Query): Promise<Record<string, unknown>> {
    const { data, headers } = await this.get<Record<string, unknown>>(path, query);
    const out: Record<string, unknown> = { ...data };
    const unitsCost = num(headers.get("x-api-units-cost-total-actual"));
    const rows = num(headers.get("x-api-rows"));
    if (unitsCost !== undefined) out.unitsCost = unitsCost;
    if (rows !== undefined) out.rows = rows;
    return out;
  }
}
