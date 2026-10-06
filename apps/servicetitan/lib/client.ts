import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * ServiceTitan's REST API (v2) — verified 2026-10-06 against the OpenAPI 3.1
 * documents the developer portal itself serves, one per module
 * (`developer.servicetitan.io/api/docs/apis/tenant-crm-v2`, `-jpm-v2`,
 * `-settings-v2`, `-dispatch-v2`), plus live unsigned probes of every host.
 *
 * The portal is a client-rendered SPA (a 452-byte shell for every path), which
 * is why it looks undocumented over plain HTTP; the specs sit behind its own
 * `/api/docs/apis` JSON index.
 *
 * **Every path is `{api host}/{module}/v2/tenant/{tenantId}/…`.** The module
 * (`crm`, `jpm`, `settings`, `dispatch`) is part of the path, not the host, and
 * the tenant id is a path segment on every operation — so the tenant id is
 * recorded as public connection metadata (`display.tenantId`), never read from
 * the credential.
 *
 * **Two environments, two host pairs.** Production is `api.servicetitan.io` /
 * `auth.servicetitan.io`; the integration (sandbox) tenant is
 * `api-integration.servicetitan.io` / `auth-integration.servicetitan.io`. The
 * spec's `servers` block lists exactly these two API hosts. Both answer a
 * request with no `ST-App-Key` as `401` and a ProblemDetails body whose `title`
 * is "Application key not present, check ST-App-Key header value.".
 */

export type Environment = "production" | "integration";

export const HOSTS: Record<Environment, { api: string; auth: string }> = {
  production: {
    api: "https://api.servicetitan.io",
    auth: "https://auth.servicetitan.io",
  },
  integration: {
    api: "https://api-integration.servicetitan.io",
    auth: "https://auth-integration.servicetitan.io",
  },
};

export function parseEnvironment(raw: unknown): Environment {
  return raw === "integration" ? "integration" : "production";
}

/** Public (redacted-safe) connection metadata. */
export interface ServiceTitanDisplay {
  tenantId?: string;
  environment?: Environment;
}

/** The tenant id is a numeric path segment; refuse anything that is not. */
export function normalizeTenantId(raw: unknown): string {
  const t = String(raw ?? "").trim();
  if (!/^\d+$/.test(t)) {
    throw new Error("ServiceTitan tenant ID must be the numeric tenant id (digits only)");
  }
  return t;
}

export function connectionTarget(connection: RedactedConnection | undefined): {
  api: string;
  tenantId: string;
} {
  const display = (connection?.display ?? {}) as ServiceTitanDisplay;
  if (!display.tenantId) {
    throw new Error(
      "this ServiceTitan connection records no tenant id — reconnect it so the tenant can be stored",
    );
  }
  return {
    api: HOSTS[parseEnvironment(display.environment)].api,
    tenantId: normalizeTenantId(display.tenantId),
  };
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, unknown>;
  body?: unknown;
}

/** Drop keys the caller left unset so an edit does not overwrite untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Comma-separated ids → a list of integers; a non-numeric entry is refused. */
export function idList(v: unknown): number[] | undefined {
  const items = csv(v);
  if (!items) return undefined;
  return items.map((s) => {
    if (!/^\d+$/.test(s)) throw new Error(`"${s}" is not a numeric id`);
    return Number(s);
  });
}

/**
 * ServiceTitan answers RFC 7807 ProblemDetails: `{type, title, status,
 * detail?, errors?: {field: [messages]}, traceId}`. The validation detail is in
 * `errors`, so it is folded into the message; the raw body is the fallback.
 */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as {
      title?: string;
      detail?: string;
      errors?: Record<string, string[] | string> | string[];
      error?: string;
      error_description?: string;
    };
    const parts: string[] = [];
    if (body.title) parts.push(body.title);
    if (body.detail) parts.push(body.detail);
    if (body.error_description) parts.push(body.error_description);
    else if (typeof body.error === "string") parts.push(body.error);
    if (body.errors && typeof body.errors === "object") {
      for (const [k, v] of Object.entries(body.errors)) {
        parts.push(`${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
      }
    }
    if (parts.length) return parts.join("; ");
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return text.slice(0, 500);
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets `Authorization` or
 * `ST-App-Key` — the runtime routes every request through the auth `sign`
 * hook, which injects both from the credential.
 */
export class ServiceTitanClient {
  readonly api: string;
  readonly tenantId: string;

  constructor(private ctx: HookContext) {
    const t = connectionTarget(ctx.connection);
    this.api = t.api;
    this.tenantId = t.tenantId;
  }

  /** `module` is the path prefix before `/v2`: `crm`, `jpm`, `settings`, `dispatch`. */
  async request<T = unknown>(
    module: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${this.api}/${module}/v2/tenant/${this.tenantId}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) url.searchParams.set(k, v.join(","));
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      const detail = errorMessage(text);
      throw new Error(
        `ServiceTitan ${res.status} ${res.statusText} for ${init.method} ${url.pathname}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
