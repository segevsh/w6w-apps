import type { HookContext } from "@w6w/types";

/**
 * RD Station CRM API v1 — the shared request layer.
 *
 * ## Where every fact here comes from
 *
 * RD Station's own OpenAPI 3.1 reference for the CRM v1 API
 * (`developers.rdstation.com/reference/crm-v1-*`, read 2026-09-22):
 *
 *   - one server, `https://crm.rdstation.com/api/v1` — no regional host, no
 *     sandbox, nothing derived from the credential;
 *   - auth is an `apiKey` in the **query string**, named `token`
 *     (`securitySchemes.Token`), injected by `auth/api-key.ts`'s `sign` hook.
 *     No action in this app ever sees the credential;
 *   - errors are plain JSON with conventional codes — `401 {"error": "Permission
 *     denied."}`, `404 {"errors": {"error_type": "RESOURCE_NOT_FOUND",
 *     "error_message": "…"}}`, `422 {"errors": {"<field>": ["…"]}}`, and `429`
 *     for the documented account-wide limit of 120 requests/minute;
 *   - lists are enveloped (`{ contacts, has_more, total }`, `organizations` the
 *     same, `deals` plus `next_page`) except `users` (`{ users: […] }`) and
 *     `deal_pipelines` (a bare array). {@link sendJson} does not guess at any of
 *     those shapes — it hands the parsed body back verbatim, because the
 *     envelope is the vendor's and re-shaping it here would be invention;
 *   - only the first **10,000** records of any list are reachable, across pages.
 *
 * ## One base URL, one query builder
 *
 * Each action builds its own URL with `new URL(`${API_BASE}/<path>`)`, attaches
 * its documented filters through {@link applyQuery} and calls {@link sendJson},
 * which is the single place `ctx.fetch` happens. Nothing here concatenates a
 * query string by hand, and nothing here touches a credential.
 */

/** The only origin the CRM v1 reference declares. */
export const API_BASE = "https://crm.rdstation.com/api/v1";

export type QueryValue = string | number | boolean | undefined | null;

/**
 * Attach every *set* query value to `url`.
 *
 * An unset, `null` or blank value is omitted rather than sent empty. That is
 * also how the CRM reads the blank form of at least one documented filter —
 * an absent `win` means "open deals", not "any deal" — so an omitted optional
 * param and an empty one end up meaning the same thing to the vendor, and the
 * caller never has to distinguish them.
 */
export function applyQuery(url: URL, query: Record<string, QueryValue>): URL {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

/** Drop keys the caller left unset — `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Keep an error message readable — a 422 body can carry one line per field. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} chars truncated)`;
}

/**
 * Pull the vendor's own prose out of either documented error envelope.
 *
 * Two shapes, one field name: an `error` **string** for auth refusals
 * (`{"error": "Permission denied."}`) and an `errors` **object** for everything
 * else — a 404 carrying `error_type`/`error_message`, or a 422 carrying one key
 * per offending field with an array of messages.
 */
export function messageFromErrorBody(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const record = body as Record<string, unknown>;

  if (typeof record.error === "string" && record.error.trim()) return record.error.trim();

  const errors = record.errors;
  if (!errors || typeof errors !== "object") return undefined;
  const entries = errors as Record<string, unknown>;

  if (typeof entries.error_message === "string" && entries.error_message.trim()) {
    const type = typeof entries.error_type === "string" ? `${entries.error_type}: ` : "";
    return `${type}${entries.error_message.trim()}`;
  }

  const parts: string[] = [];
  for (const [field, value] of Object.entries(entries)) {
    if (Array.isArray(value)) parts.push(`${field}: ${value.join(", ")}`);
    else if (typeof value === "string") parts.push(`${field}: ${value}`);
  }
  return parts.length ? parts.join("; ") : undefined;
}

/**
 * Render a failed CRM v1 response.
 *
 * The vendor's own message is kept verbatim, because the fix differs per code —
 * a 401 means the token, a 422 means the body — and a flattened "HTTP 422"
 * hides which one was hit. The credential never appears here: this function only
 * ever sees the response body.
 */
export function formatRdStationError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    body = undefined; // not JSON — fall through to the raw body
  }

  const parts = [`RD Station CRM ${status} for ${method} ${path}`];
  const detail = messageFromErrorBody(body);
  if (detail) parts.push(detail);
  else if (raw.trim()) parts.push(truncate(raw.trim()));

  if (status === 401) {
    parts.push(
      "the token is missing, disabled or invalid — generate a live one in RD Station CRM under " +
        "Configurações → Integrações → Tokens",
    );
  }
  if (status === 429) {
    parts.push("the account is limited to 120 requests/minute; retry with backoff");
  }
  return truncate(parts.join(": "), 1000);
}

/**
 * Parse a JSON body, tolerating an empty one (a `204`, or a 201 with no body).
 *
 * Deliberately NOT `res.json()`: a failure path has to be readable even when the
 * body is HTML from an intermediary, and `jsonBody` never throws.
 */
export async function jsonBody(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** A JSON request init — the only content type this API speaks. */
export function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

/**
 * Perform one request through the host-mediated fetch and return the parsed body.
 *
 * This is the only `ctx.fetch` in the app's action surface. A non-2xx answer is
 * turned into an `Error` carrying {@link formatRdStationError}'s message, so a
 * failing step says what RD Station said.
 */
export async function sendJson(
  ctx: HookContext,
  url: URL,
  init: RequestInit = {},
): Promise<unknown> {
  const method = init.method ?? "GET";
  const headers: Record<string, string> = {
    accept: "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await ctx.fetch(url.toString(), { ...init, method, headers });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(formatRdStationError(res.status, method, url.pathname, detail));
  }
  return jsonBody(res);
}

/**
 * Normalise a `json`-typed param into an array.
 *
 * The editor may hand a JSON param over as an already-parsed array/object or as
 * the raw text the user typed; both are accepted, and a string that is not valid
 * JSON is refused loudly rather than silently dropped (a contact created without
 * the emails the user typed is worse than a failed step).
 */
export function asArray<T>(value: unknown): T[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error("expected a JSON array (or a single object) — the value is not valid JSON");
    }
    return Array.isArray(parsed) ? parsed as T[] : [parsed as T];
  }
  if (typeof value === "object") return [value as T];
  throw new Error("expected a JSON array (or a single object)");
}
