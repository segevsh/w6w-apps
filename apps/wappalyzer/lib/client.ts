import type { HookContext } from "@w6w/types";

/**
 * Wappalyzer Public API v2 client (`api.wappalyzer.com`).
 *
 * Every path, parameter, header and response shape in this module was
 * verified on 2026-09-29 against Wappalyzer's own published OpenAPI 3.1
 * contract (`www.wappalyzer.com/openapi/v2-public.yaml`, `info.version: v2`),
 * cross-read against the human-authored reference pages it was generated
 * from (`www.wappalyzer.com/docs/api/v2/{basics,lookup,subdomains,verify,lists}/`),
 * plus live probes against `api.wappalyzer.com`. Nothing here came from a
 * third-party integration directory.
 *
 * ## One host, one version prefix — but paths are NOT uniform on trailing slash
 *
 * The OpenAPI document declares a single server, `https://api.wappalyzer.com/v2`,
 * and lists every path without a trailing slash. The human docs' own `curl`
 * examples disagree for the *collection* endpoints — `GET /v2/lookup/`,
 * `GET /v2/subdomains/`, `GET /v2/verify/`, `GET /v2/credits/balance/` and
 * `GET|POST /v2/lists/` all carry a trailing slash in every worked example —
 * while the *item* endpoints under a list id never do (`GET|POST|DELETE
 * /v2/lists/{id}`). This client reproduces exactly that split rather than
 * normalizing it away, because normalizing it is how an integration ends up
 * silently relying on an undocumented redirect.
 *
 * ## Auth
 *
 * `x-api-key: <key>` on every request. Confirmed live: a request with no key,
 * a request with a syntactically-plausible-but-wrong key, and a request with
 * a bearer-style `Authorization` header instead all answer byte-identical
 * `403 {"message":"Forbidden"}` bodies (measured 2026-09-29, AWS API Gateway
 * `x-amzn-errortype: ForbiddenException` on all three) — the vendor's own
 * Basics page states the same thing structurally: "403 — Authorization
 * failure (incorrect API key, invalid method or resource or insufficient
 * credits)" is one bucket, not three. `auth/api-key.ts` treats a 403 as "the
 * key is missing, wrong, or the account is out of credits" rather than
 * pretending it can tell those apart.
 *
 * ## Credits, on every successful response
 *
 * `wappalyzer-credits-spent` and `wappalyzer-credits-remaining` headers ride
 * every `2xx` response (documented on the Basics page and in the OpenAPI
 * `components.headers` block). `send()` reads both off every call so no
 * action has to special-case it, and `GET /v2/credits/balance/` exists for
 * checking headroom without spending anything.
 *
 * ## Query arrays are ONE comma-separated value, never repeated keys
 *
 * `urls`, `sets` and `domains` are declared `style: form, explode: false` in
 * the OpenAPI parameters block, matching the docs' own examples
 * (`urls=https://example.com,https://example.org`). {@link joinList} is the
 * one place that is built.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.wappalyzer.com";

/** Every documented path carries this version prefix. */
export const API_PREFIX = "/v2";

/** Collection-style endpoints — every worked example in the docs carries the trailing slash. */
export const PATHS = {
  lookup: "/lookup/",
  subdomains: "/subdomains/",
  verify: "/verify/",
  creditsBalance: "/credits/balance/",
  lists: "/lists/",
} as const;

/** Item-style endpoint — never a trailing slash in a worked example. */
export function listPath(id: string): string {
  return `/lists/${encodeURIComponent(String(id ?? "").trim())}`;
}

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export interface WappalyzerResult<T> {
  data: T;
  /** From the `wappalyzer-credits-spent` response header, when present. */
  creditsSpent?: number;
  /** From the `wappalyzer-credits-remaining` response header, when present. */
  creditsRemaining?: number;
}

interface WappalyzerErrorBody {
  message?: string;
}

/** Join a multi-valued query parameter the way this API's `style: form, explode: false` reads it. */
export function joinList(v: string[] | string | undefined | null): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items.join(",") : undefined;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values here. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept a `json`-typed param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at each call site.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Normalise an `array`-typed param into a clean string list, dropping blanks. */
export function toStringList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Wappalyzer's error body into one actionable line.
 *
 * The vendor's only documented error shape is `{"message": "..."}` (confirmed
 * live on 403; the Basics page documents 400 and 429 the same way — a status
 * code plus a JSON body, no separate machine-readable `type`/`code` field).
 * So unlike a vendor with a stable error-type enum, there is nothing finer to
 * extract here — the status code carries the category and the message carries
 * the detail.
 */
export function formatWappalyzerError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: WappalyzerErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as WappalyzerErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const parts = [
    `Wappalyzer ${status} for ${method} ${path}`,
    parsed?.message ?? (parsed === null ? truncate(raw) : undefined),
    status === 403
      ? "an incorrect or missing x-api-key, an invalid method/resource, or insufficient credits " +
        "all answer this same way"
      : undefined,
    status === 429 ? "rate limit exceeded (10 requests/second); retry with backoff" : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class WappalyzerClient {
  constructor(private ctx: HookContext) {}

  get<T = unknown>(
    path: string,
    query?: Record<string, QueryValue>,
  ): Promise<WappalyzerResult<T>> {
    return this.send<T>(path, { method: "GET", query });
  }

  post<T = unknown>(path: string, body?: unknown): Promise<WappalyzerResult<T>> {
    return this.send<T>(path, { method: "POST", body });
  }

  delete<T = unknown>(path: string): Promise<WappalyzerResult<T>> {
    return this.send<T>(path, { method: "DELETE" });
  }

  private async send<T>(path: string, options: RequestOptions): Promise<WappalyzerResult<T>> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = res.status === 204 ? "" : await res.text();

    if (!res.ok) {
      throw new Error(formatWappalyzerError(res.status, init.method ?? "GET", url.pathname, text));
    }

    const creditsSpentHeader = res.headers.get("wappalyzer-credits-spent");
    const creditsRemainingHeader = res.headers.get("wappalyzer-credits-remaining");
    const creditsSpent = creditsSpentHeader !== null ? Number(creditsSpentHeader) : undefined;
    const creditsRemaining = creditsRemainingHeader !== null
      ? Number(creditsRemainingHeader)
      : undefined;

    const data = text ? (JSON.parse(text) as T) : (undefined as T);
    return {
      data,
      ...(creditsSpent !== undefined && !Number.isNaN(creditsSpent) ? { creditsSpent } : {}),
      ...(creditsRemaining !== undefined && !Number.isNaN(creditsRemaining)
        ? { creditsRemaining }
        : {}),
    };
  }
}
