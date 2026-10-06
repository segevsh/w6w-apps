import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Document360 Customer API **v3** — verified on 2026-10-06 against Document360's own OpenAPI 3.0.1
 * document (`https://apihub.document360.io/swagger/v3/swagger.json`, 4,544,745 bytes,
 * `info.title` "Document360 Customer API", `info.version` 3.0.0, 149 paths) and the v3 reference
 * at `apidocs.document360.com/apidocs`.
 *
 * ## Which API is current
 *
 * The docs portal carries three generations: v1 and v2 authenticate with an `api_token` header,
 * v3 with `X-API-Key`. v3 is the one the portal's root (`/apidocs`) documents, and the one this
 * app speaks. v1/v2 are not touched.
 *
 * ## Hosts
 *
 * Each project lives in one data centre. The docs name three hosts (`Making your first request`):
 *
 *   Europe (default)  https://apihub.document360.io
 *   United States     https://apihub.us.document360.io
 *   Canada            https://apihub.ca.document360.io
 *
 * The OpenAPI `servers[]` additionally lists a templated private-hosting host
 * (`apihub.{private_hosting}.document360.io`); a manifest cannot enumerate it, so private hosting
 * is not supported. A key only works against the data centre its project is in, so the region is
 * a Connection field.
 *
 * ## Envelopes
 *
 * Success: `{ success, request_id, data, errors, warnings }`, plus `pagination`
 * `{ page, page_size, total_count?, has_more, next_cursor? }` on lists. Errors are RFC 7807
 * `application/problem+json` with `errors[].code`. **The one exception is the gateway 401**: a
 * missing or invalid key answers `401` with an empty body (`content-length: 0`, measured live on
 * all three hosts), so a 401 can never be told apart by body — it is the only signal.
 */

export const REGIONS = {
  eu: { host: "apihub.document360.io", label: "Europe" },
  us: { host: "apihub.us.document360.io", label: "United States" },
  ca: { host: "apihub.ca.document360.io", label: "Canada" },
} as const;

export type Region = keyof typeof REGIONS;

export const DEFAULT_REGION: Region = "eu";

/** Public (redacted-safe) connection metadata this app publishes. */
export interface Document360Display {
  region?: Region;
  projectId?: string;
}

export function isRegion(v: unknown): v is Region {
  return typeof v === "string" && Object.hasOwn(REGIONS, v);
}

export function resolveRegion(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as Document360Display;
  return isRegion(display.region) ? display.region : DEFAULT_REGION;
}

export function apiBase(region: Region): string {
  return `https://${REGIONS[region].host}`;
}

/** The headers every request carries. The key itself is added by `sign`, never here. */
export function baseHeaders(): Record<string, string> {
  return { accept: "application/json" };
}

/** Pagination block returned on list endpoints. */
export interface Pagination {
  page?: number;
  page_size?: number;
  total_count?: number | null;
  has_more?: boolean;
  next_cursor?: string | null;
}

export interface ApiError {
  code?: string;
  message?: string;
  field?: string | null;
}

/** RFC 7807 body. Every non-2xx other than the gateway 401/503 carries one. */
export interface Problem {
  title?: string;
  detail?: string;
  status?: number;
  trace_id?: string;
  errors?: ApiError[];
}

/** The machine-readable error codes of the first `errors[]` entry, if any. */
export function errorCodes(problem: Problem | null): string[] {
  return (problem?.errors ?? []).map((e) => String(e.code ?? "")).filter(Boolean);
}

export async function readProblem(res: Response): Promise<Problem | null> {
  const text = await res.clone().text().catch(() => "");
  if (!text) return null;
  try {
    const body = JSON.parse(text);
    return body && typeof body === "object" ? body as Problem : null;
  } catch {
    return null;
  }
}

/** One-line description of a failed response, from the body where there is one. */
export function describeProblem(res: Response, problem: Problem | null): string {
  const parts: string[] = [`HTTP ${res.status}`];
  const codes = errorCodes(problem);
  if (codes.length) parts.push(codes.join(","));
  const msgs = (problem?.errors ?? []).map((e) =>
    e.field ? `${e.field}: ${e.message ?? e.code}` : String(e.message ?? "")
  ).filter(Boolean);
  const text = msgs.length ? msgs.join("; ") : (problem?.detail ?? problem?.title ?? "");
  if (text) parts.push(text);
  if (res.status === 401 && !problem) parts.push("missing or invalid API key (empty body)");
  if (res.status === 429) {
    const retry = res.headers.get("retry-after");
    if (retry) parts.push(`retry after ${retry}s`);
  }
  if (problem?.trace_id) parts.push(`trace ${problem.trace_id}`);
  return parts.join(" — ");
}

export type Query = Record<string, unknown>;

interface Envelope<T> {
  success?: boolean;
  data?: T;
  pagination?: Pagination;
  errors?: ApiError[];
}

/** Thin request helper: resolves region + project, signs nothing, unwraps the envelope. */
export class Document360Client {
  constructor(private ctx: HookContext) {}

  get region(): Region {
    return resolveRegion(this.ctx.connection);
  }

  /** The project to address: the action's own override, else the Connection's default. */
  projectId(override?: string): string {
    const explicit = (override ?? "").trim();
    if (explicit) return explicit;
    const display = (this.ctx.connection?.display ?? {}) as Document360Display;
    if (display.projectId) return display.projectId;
    throw new Error(
      "Document360: no project id. Set one on the Connection, or pass projectId (list them " +
        "with the project-list action).",
    );
  }

  /** `/v3/projects/{id}` + suffix, with the id escaped. */
  projectPath(override: string | undefined, suffix = ""): string {
    return `/v3/projects/${encodeId(this.projectId(override))}${suffix}`;
  }

  url(path: string, query?: Query): string {
    const u = new URL(path, apiBase(this.region));
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) u.searchParams.append(k, String(item));
      } else {
        u.searchParams.set(k, String(v));
      }
    }
    return u.toString();
  }

  private async send<T>(
    method: string,
    path: string,
    opts: { query?: Query; body?: unknown },
  ): Promise<{ status: number; body: Envelope<T> | null }> {
    const hasBody = opts.body !== undefined;
    const res = await this.ctx.fetch(this.url(path, opts.query), {
      method,
      headers: hasBody ? { ...baseHeaders(), "content-type": "application/json" } : baseHeaders(),
      body: hasBody ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) {
      throw new Error(
        `Document360 ${method} ${path} failed: ${describeProblem(res, await readProblem(res))}`,
      );
    }
    if (res.status === 204) return { status: 204, body: null };
    const text = await res.text();
    if (!text) return { status: res.status, body: null };
    let body: Envelope<T>;
    try {
      body = JSON.parse(text) as Envelope<T>;
    } catch {
      throw new Error(
        `Document360 ${method} ${path} returned a non-JSON body (HTTP ${res.status})`,
      );
    }
    if (body && body.success === false) {
      throw new Error(
        `Document360 ${method} ${path} reported failure: ${
          (body.errors ?? []).map((e) => e.message ?? e.code).join("; ") || "no detail"
        }`,
      );
    }
    return { status: res.status, body };
  }

  /** Single-resource call: returns the envelope's `data` (null when there is none). */
  async data<T = Record<string, unknown>>(
    method: string,
    path: string,
    opts: { query?: Query; body?: unknown } = {},
  ): Promise<T | null> {
    const { body } = await this.send<T>(method, path, opts);
    return (body?.data ?? null) as T | null;
  }

  /** List call: `{ items, pagination }`. */
  async list<T = Record<string, unknown>>(
    path: string,
    query?: Query,
  ): Promise<{ items: T[]; pagination: Pagination | null }> {
    const { body } = await this.send<T[]>("GET", path, { query });
    const data = body?.data;
    return { items: Array.isArray(data) ? data : [], pagination: body?.pagination ?? null };
  }
}

export function encodeId(id: string): string {
  return encodeURIComponent(String(id).trim());
}

/** Drop undefined/null/empty-string members, so a PATCH sends only what the caller set. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** `select` options for the Connection's data-center field. */
export const REGION_OPTIONS = Object.entries(REGIONS).map(([value, { host, label }]) => ({
  value,
  label: `${label} (${host})`,
}));

/** Accept an array or a comma-separated string and return clean, non-empty members. */
export function toList(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  const parts = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}
