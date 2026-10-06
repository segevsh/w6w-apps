import type { HookContext, OutputField, Param, RedactedConnection } from "@w6w/types";

/**
 * Procore has two separate worlds: production (`api.procore.com`, OAuth at
 * `login.procore.com`) and the developer sandbox (`sandbox.procore.com`, OAuth
 * at `login-sandbox.procore.com`). A connection belongs to exactly one, and
 * `afterConnect` records which as `display.apiBase`, which is what this client
 * reads. Actions never see the credential, so the environment has to travel on
 * the connection's display metadata.
 */
export const PRODUCTION_API = "https://api.procore.com";
export const SANDBOX_API = "https://sandbox.procore.com";
export const API_BASES = [PRODUCTION_API, SANDBOX_API];

/** The header Procore uses to route a call to the company's zone (MPZ). */
export const COMPANY_HEADER = "Procore-Company-Id";

export type QueryValue = string | number | boolean | undefined | null;

export interface Page<T = unknown> {
  items: T[];
  /** The page that was requested (1-based). */
  page: number;
  perPage?: number;
  /** Next page number, from the `Link: rel="next"` header; absent on the last page. */
  nextPage?: number;
  lastPage?: number;
  hasMore: boolean;
}

/** Shared params, so every action declares the company override identically. */
export const companyIdParam: Param = {
  key: "companyId",
  label: "Company ID",
  type: "number",
  validation: { integer: true, min: 1 },
  hint: "Sent as the `Procore-Company-Id` header. Leave blank to use the company ID saved on the " +
    "connection. Find IDs with the List Companies action.",
};

export const pagingParams: Param[] = [
  { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
  {
    key: "perPage",
    label: "Per page",
    type: "number",
    validation: { integer: true, min: 1, max: 100 },
    hint: "Procore's default page size applies when blank.",
  },
];

export const projectIdParam: Param = {
  key: "projectId",
  label: "Project ID",
  type: "number",
  required: true,
  validation: { integer: true, min: 1 },
};

export const apiBaseOf = (connection: RedactedConnection | undefined): string => {
  const display = (connection?.display ?? {}) as { apiBase?: string };
  return (API_BASES as readonly string[]).includes(display.apiBase ?? "")
    ? display.apiBase as string
    : PRODUCTION_API;
};

export const defaultCompanyOf = (
  connection: RedactedConnection | undefined,
): number | undefined => {
  const display = (connection?.display ?? {}) as { companyId?: unknown };
  const n = Number(display.companyId);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** JSON body. */
  body?: unknown;
  /** Per-call company override; falls back to the connection's default company. */
  companyId?: number | string;
  /** `me` and `companies` are the two endpoints that take no company header. */
  noCompany?: boolean;
}

export interface Reply<T> {
  data: T;
  status: number;
  link: string | null;
}

function withQuery(url: string, query?: Record<string, QueryValue>): string {
  if (!query) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

/** Parses Procore's `Link` header into `{ next: 2, last: 5 }` page numbers. */
export function parseLink(link: string | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (!link) return out;
  for (const part of link.split(",")) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="?(\w+)"?/);
    if (!m) continue;
    try {
      const page = Number(new URL(m[1], PRODUCTION_API).searchParams.get("page"));
      if (Number.isInteger(page) && page > 0) out[m[2]] = page;
    } catch { /* ignore a malformed link */ }
  }
  return out;
}

/** Thin wrapper over `ctx.fetch`. Auth is injected by the Auth `sign` hook, never here. */
export class ProcoreClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<Reply<T>> {
    const url = withQuery(`${apiBaseOf(this.ctx.connection)}${path}`, options.query);
    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    if (!options.noCompany) {
      const company = options.companyId !== undefined && options.companyId !== ""
        ? options.companyId
        : defaultCompanyOf(this.ctx.connection);
      if (company !== undefined) headers[COMPANY_HEADER] = String(company);
    }
    let body: string | undefined;
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url, { method, headers, body });
    if (!res.ok) {
      let detail = "";
      try {
        detail = (await res.text()).slice(0, 500);
      } catch { /* ignore */ }
      throw new Error(`Procore ${res.status} ${res.statusText} for ${method} ${path}: ${detail}`);
    }
    const link = res.headers.get("link");
    if (res.status === 204) return { data: undefined as T, status: res.status, link };
    const data = await res.json().catch(() => undefined) as T;
    return { data, status: res.status, link };
  }

  /** GET a collection and fold the Link header into a page marker. */
  async list<T = unknown>(
    path: string,
    input: { page?: number; perPage?: number; companyId?: number | string },
    query: Record<string, QueryValue> = {},
    extra: { noCompany?: boolean } = {},
  ): Promise<Page<T>> {
    const reply = await this.request<T[] | { data?: T[] }>(path, {
      query: { ...query, page: input.page, per_page: input.perPage },
      companyId: input.companyId,
      noCompany: extra.noCompany,
    });
    const items = Array.isArray(reply.data) ? reply.data : [];
    const links = parseLink(reply.link);
    return {
      items,
      page: input.page ?? 1,
      perPage: input.perPage,
      nextPage: links.next,
      lastPage: links.last,
      hasMore: links.next !== undefined,
    };
  }
}

/** Output descriptors shared by every list action. */
export const pageOutput: OutputField[] = [
  { key: "items", type: "array", label: "Items on this page" },
  { key: "page", type: "number", label: "Page" },
  { key: "perPage", type: "number", label: "Per page" },
  { key: "nextPage", type: "number", label: "Next page (absent on the last page)" },
  { key: "lastPage", type: "number", label: "Last page" },
  { key: "hasMore", type: "boolean", label: "Another page follows" },
];
