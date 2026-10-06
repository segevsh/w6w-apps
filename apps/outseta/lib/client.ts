import type { HookContext } from "@w6w/types";

/**
 * Outseta is addressed per account: `https://<subdomain>.outseta.com/api/v1`.
 * The subdomain is the part before `.outseta.com` in the admin URL. The vendor
 * domain is fixed, so the manifest allows `*.outseta.com` rather than `*`.
 *
 * The auth method's `afterConnect` hook publishes the normalised subdomain on
 * `connection.display`, so action code builds the URL without the credential.
 */
export const API_PATH = "/api/v1";
export const OUTSETA_DOMAIN = "outseta.com";

export interface OutsetaConnectionDisplay {
  /** Bare account subdomain, e.g. `acme`. Never a URL. */
  subdomain?: string;
}

/**
 * Accepts `acme`, `acme.outseta.com`, `https://acme.outseta.com/` or a pasted
 * `https://acme.outseta.com/api/v1/...` and returns `acme`.
 */
export function normalizeSubdomain(raw: string): string {
  let host = String(raw ?? "").trim().toLowerCase();
  host = host.replace(/^https?:\/\//, "");
  host = host.replace(/[/?#].*$/, "");
  host = host.replace(/\.outseta\.com$/, "");
  return host.replace(/^\.+|\.+$/g, "");
}

export function isValidSubdomain(sub: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(sub);
}

export function apiHost(raw: string): string {
  const sub = normalizeSubdomain(raw);
  if (!sub) throw new Error("Outseta connection is missing an account subdomain");
  if (!isValidSubdomain(sub)) {
    throw new Error(
      `"${sub}" is not an Outseta subdomain — expected a single label such as \`acme\``,
    );
  }
  return `${sub}.${OUTSETA_DOMAIN}`;
}

export function resolveApiUrl(display: OutsetaConnectionDisplay | undefined): string {
  return `https://${apiHost(display?.subdomain ?? "")}${API_PATH}`;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** JSON body. Present => sent as `application/json`. */
  body?: unknown;
}

/** Drop `undefined`, `null` and empty-string entries. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Parse a JSON-object param. The UI hands a string, a workflow may hand an
 * object; both are accepted. Anything else is rejected rather than coerced.
 */
export function asObject(value: unknown, label: string): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`${label} is not valid JSON`);
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Merge the typed fields over a free-form `properties` object. Outseta's own
 * guidance for custom properties is "include them in the same way they appear
 * on a GET", so the escape hatch is a plain object; typed params win on a clash.
 */
export function buildBody(
  typed: Record<string, unknown>,
  properties: unknown,
): Record<string, unknown> {
  return { ...(asObject(properties, "properties") ?? {}), ...compact(typed) };
}

/**
 * Turn the `filters` param into query parameters. Outseta filters by entity
 * property name (`Email=…`, `Created__gt=…`, wildcard `*` at either end).
 * Names that collide with the paging/shape parameters are refused so a filter
 * can never silently overwrite `limit`, `offset`, `fields` or `orderBy`.
 */
export function filterQuery(filters: unknown): Record<string, QueryValue> {
  const obj = asObject(filters, "filters") ?? {};
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (/^(limit|offset|fields|orderby)$/i.test(k)) {
      throw new Error(`filters cannot set "${k}" — use the dedicated parameter`);
    }
    if (v === null || v === undefined) continue;
    if (typeof v === "object") throw new Error(`filters.${k} must be a string, number or boolean`);
    out[k] = v as QueryValue;
  }
  return out;
}

export interface OutsetaList<T = unknown> {
  metadata?: { limit?: number; offset?: number; total?: number };
  items?: T[];
}

export const PAGE_PARAMS = [
  {
    key: "limit",
    label: "Limit",
    type: "number" as const,
    hint:
      "Page size. Outseta defaults to 25 and caps at 100 (25 when `fields` expands child objects).",
    validation: { min: 1, max: 100, integer: true },
  },
  {
    key: "offset",
    label: "Page",
    type: "number" as const,
    hint:
      "Zero-based PAGE NUMBER, not a record offset: with limit 20, the second page is 1, not 20.",
    validation: { min: 0, integer: true },
  },
  {
    key: "fields",
    label: "Fields",
    type: "string" as const,
    advanced: true,
    placeholder: "Uid,Name,CurrentSubscription.Plan.Uid",
    hint:
      "Comma-separated property paths to return. Unknown paths are silently dropped, not rejected.",
  },
  {
    key: "orderBy",
    label: "Order by",
    type: "string" as const,
    advanced: true,
    placeholder: "Created DESC",
    hint: "Property name and direction, e.g. `Created DESC`.",
  },
  {
    key: "filters",
    label: "Filters",
    type: "json" as const,
    advanced: true,
    hint:
      'Property filters as a JSON object, e.g. `{"AccountStage": 3, "Created__gt": "2026-01-01"}`. ' +
      "Operators: `__gt`, `__gte`, `__lt`, `__lte`, `__ne`, `__isnull`; `*` wildcards at either end.",
  },
];

export const PAGE_OUTPUT = [
  { key: "metadata", type: "object" as const, label: "Paging: limit, offset (page), total" },
  { key: "items", type: "array" as const, label: "Results" },
];

export interface PageInput {
  limit?: number;
  offset?: number;
  fields?: string;
  orderBy?: string;
  filters?: unknown;
}

/** The paging, shaping and filter query shared by every list action. */
export function pageQuery(input: PageInput): Record<string, QueryValue> {
  return {
    ...filterQuery(input.filters),
    limit: input.limit,
    offset: input.offset,
    fields: input.fields,
    orderBy: input.orderBy,
  };
}

interface OutsetaError {
  ErrorMessage?: string;
  PropertyName?: string;
  error?: unknown;
  Message?: string;
}

export class OutsetaClient {
  constructor(private ctx: HookContext, private apiUrl: string) {}

  static fromConnection(ctx: HookContext): OutsetaClient {
    const display = (ctx.connection?.display ?? {}) as OutsetaConnectionDisplay;
    return new OutsetaClient(ctx, resolveApiUrl(display));
  }

  /**
   * Never builds an `Authorization` header: the runtime routes every request
   * through the auth `sign` hook, the only code handed the credential.
   */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.apiUrl}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.append(k, String(v));
    }

    const method = (options.method ?? (options.body !== undefined ? "POST" : "GET")).toUpperCase();
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    const type = res.headers.get("content-type") ?? "";

    if (!res.ok) throw new Error(describeFailure(res.status, method, url.pathname, text, type));

    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // Several action endpoints (cancel, reply, …) are documented as returning
      // application/octet-stream. An HTML body is never that — it is an error page.
      if (/html/i.test(type)) {
        throw new Error(`Outseta returned an HTML page for ${method} ${url.pathname}`);
      }
      return { raw: text.slice(0, 2000) } as T;
    }
  }
}

/**
 * Outseta's failure bodies are mostly EMPTY (measured 2026-10-06): a rejected
 * key on a real account is `403` with no body, an unknown subdomain is `404`
 * with no body, and a request Cloudflare dislikes is a `403` HTML page. Only
 * validation errors carry `{ErrorMessage, PropertyName}`. So the message leans
 * on the body when there is one and names the likely cause when there is not.
 */
export function describeFailure(
  status: number,
  method: string,
  pathname: string,
  text: string,
  contentType = "",
): string {
  let parsed: OutsetaError | undefined;
  try {
    parsed = text ? JSON.parse(text) as OutsetaError : undefined;
  } catch {
    // not JSON
  }
  const where = `${method} ${pathname}`;
  if (parsed?.ErrorMessage) {
    const prop = parsed.PropertyName ? ` (${parsed.PropertyName})` : "";
    return `Outseta ${status}${prop} for ${where}: ${parsed.ErrorMessage}`;
  }
  if (/html/i.test(contentType) || /^\s*</.test(text)) {
    return `Outseta ${status} for ${where}: blocked by an HTML error page before reaching the API`;
  }
  if (!text) {
    const hint = status === 401 || status === 403
      ? "the API key/secret was rejected, or lacks access to this resource"
      : status === 404
      ? "no such record, or no Outseta account at this subdomain"
      : status === 429
      ? "rate limited (API keys are limited to about 4 requests/second)"
      : "empty response body";
    return `Outseta ${status} for ${where}: ${hint}`;
  }
  return `Outseta ${status} for ${where}: ${text.slice(0, 300)}`;
}

/** Percent-encode one path segment (Uids are short alphanumerics, but never trust). */
export function pathId(id: string): string {
  return encodeURIComponent(String(id ?? ""));
}
