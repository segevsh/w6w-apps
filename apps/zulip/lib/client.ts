import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Zulip Cloud serves every organization from its own host, `<subdomain>.zulipchat.com`,
 * under `/api/v1` (`servers[0]` of Zulip's OpenAPI document). Self-hosted servers and
 * organizations on a custom domain are not reachable: the egress allowlist is
 * `*.zulipchat.com`.
 */
export const CLOUD_DOMAIN = "zulipchat.com";

/**
 * Accept what a person pastes — `acme`, `acme.zulipchat.com` or `https://acme.zulipchat.com/` —
 * and return the bare subdomain. Returns `undefined` for anything that is not a single DNS
 * label, so a stored value can never smuggle a path, port or second host into a URL.
 */
export function normalizeSubdomain(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  let s = input.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (s.endsWith(`.${CLOUD_DOMAIN}`)) s = s.slice(0, -(CLOUD_DOMAIN.length + 1));
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(s) ? s : undefined;
}

export function apiBase(subdomain: string): string {
  return `https://${subdomain}.${CLOUD_DOMAIN}/api/v1`;
}

/** Base URL from the redacted Connection, where `afterConnect` recorded the subdomain. */
export function baseFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { subdomain?: string };
  const sub = normalizeSubdomain(display.subdomain);
  if (sub) return apiBase(sub);
  throw new Error(
    "Zulip connection has no organization subdomain — reconnect the account so it can be recorded.",
  );
}

/** Percent-encode one path segment. */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

/**
 * Accept a list as a real array or as the comma-separated text a form field produces.
 * Empty entries are dropped; an empty result is `undefined`.
 */
export function strList(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value.map(String) : String(value).split(",");
  const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/** A list of ids as integers when every entry is numeric, otherwise as strings (emails). */
export function idOrEmailList(value: unknown): Array<number | string> | undefined {
  const items = strList(value);
  if (!items) return undefined;
  return items.every((s) => /^\d+$/.test(s)) ? items.map(Number) : items;
}

/** A list of integer ids; non-numeric entries are an error rather than silently dropped. */
export function intList(value: unknown, label: string): number[] | undefined {
  const items = strList(value);
  if (!items) return undefined;
  return items.map((s) => {
    if (!/^\d+$/.test(s)) throw new Error(`${label}: "${s}" is not an integer id`);
    return Number(s);
  });
}

export type Params = Record<string, unknown>;

/**
 * Zulip takes every parameter as a string: scalars as-is, and anything structured
 * (`narrow`, `to`, `message_ids`, `subscriptions`, ...) JSON-encoded inside that string.
 * Unset and null values are skipped; `false`/`0`/`""` are real values and kept.
 */
export function encodeParams(params: Params | undefined): URLSearchParams {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined || v === null) continue;
    out.append(
      k,
      typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v),
    );
  }
  return out;
}

export interface ZulipResult {
  result?: string;
  msg?: string;
  code?: string;
  [key: string]: unknown;
}

export interface RequestOptions {
  /** Sent as the query string (GET/DELETE with no body). */
  query?: Params;
  /** Sent as an `application/x-www-form-urlencoded` body. */
  form?: Params;
}

/**
 * Thin client over `https://<org>.zulipchat.com/api/v1`. Credentials are never handled
 * here: the runtime routes every `ctx.fetch` through the Auth `sign` hook, which stamps
 * `Authorization: Basic base64(email:apiKey)`.
 */
export class ZulipClient {
  private readonly base: string;

  constructor(private readonly ctx: HookContext) {
    this.base = baseFromConnection(ctx.connection);
  }

  async request<T = ZulipResult>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const qs = options.query ? encodeParams(options.query).toString() : "";
    const url = `${this.base}${path}${qs ? `?${qs}` : ""}`;
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.form) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = encodeParams(options.form).toString();
    }

    const res = await this.ctx.fetch(url, init);
    const text = await res.text();
    let parsed: ZulipResult | undefined;
    try {
      parsed = text.trim() ? JSON.parse(text) : undefined;
    } catch { /* non-JSON body: reported below */ }

    // Zulip documents 4xx/5xx for errors, but every error body also carries
    // `result: "error"`, so honour either signal.
    if (!res.ok || parsed?.result === "error") throw new Error(failure(method, path, res, parsed));
    return (parsed ?? {}) as T;
  }
}

/** One human line from a failed response, including Zulip's machine `code` and retry hint. */
export function failure(
  method: string,
  path: string,
  res: { status: number },
  body: ZulipResult | undefined,
): string {
  const parts = [`Zulip ${method} ${path} failed: HTTP ${res.status}`];
  if (body?.msg) parts.push(` — ${body.msg}`);
  if (body?.code) parts.push(` [${body.code}]`);
  if (body?.code === "RATE_LIMIT_HIT" && body["retry-after"] !== undefined) {
    parts.push(` (retry after ${body["retry-after"]}s)`);
  }
  if (!body?.msg) parts.push(hint(res.status));
  return parts.join("");
}

function hint(status: number): string {
  switch (status) {
    case 301:
    case 302:
      return " (the organization has moved — it may use a custom domain this app cannot reach)";
    case 401:
      return " (email or API key missing or invalid)";
    case 403:
      return " (the user lacks permission for this)";
    case 429:
      return " (rate limited)";
    default:
      return "";
  }
}

/** The documented fields of a success response, minus the `result` / `msg` envelope. */
export function payload(res: ZulipResult): Record<string, unknown> {
  const { result: _result, msg: _msg, ignored_parameters_unsupported: _ignored, ...rest } = res;
  return rest;
}

/**
 * Accept a JSON value either parsed or as the JSON text a form field produces. Unparseable
 * text passes through so Zulip, not this app, rejects it.
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
