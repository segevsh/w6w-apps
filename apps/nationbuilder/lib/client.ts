import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * NationBuilder gives every customer ("nation") its own host —
 * `{slug}.nationbuilder.com` — confirmed as the `servers.url` template
 * (`https://{subdomain}.nationbuilder.com`) in the vendor's own downloadable
 * OpenAPI spec (`nationbuilder.com/api/v2/reference`, fetched 2026-09-15,
 * `docs/v2/released.yaml`). A manifest cannot enumerate those, so
 * `w6w.network.allow` declares the wildcard `*.nationbuilder.com`; the
 * runtime's egress matcher accepts any subdomain of it while still refusing
 * everything else.
 *
 * The slug itself comes from the Connection, not from an Action param: both
 * auth methods stash it on the connection's redacted `display` in
 * `afterConnect`, and the client reads it from there — the same pattern this
 * pack already uses for Zendesk's subdomain and Freshdesk's domain.
 */
export function slugFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { slug?: string };
  if (display.slug) return display.slug;
  throw new Error(
    "NationBuilder connection has no nation slug — reconnect the account so it can be recorded.",
  );
}

export function baseUrl(slug: string): string {
  return `https://${slug}.nationbuilder.com/api/v2`;
}

/** A single JSON:API resource object — the shape of every `data` entry. */
export interface JsonApiResource {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, unknown>;
}

/** The JSON:API top-level document shape every NationBuilder v2 response uses. */
export interface JsonApiDocument {
  data?: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
  meta?: Record<string, unknown>;
  links?: Record<string, unknown>;
}

/**
 * Flatten a JSON:API resource into `{ id, type, ...attributes }` — a plain
 * object a workflow can read directly instead of reaching through
 * `data.attributes` on every field.
 */
export function flatten(
  resource: JsonApiResource | undefined | null,
): Record<string, unknown> | undefined {
  if (!resource) return undefined;
  return { id: resource.id, type: resource.type, ...(resource.attributes ?? {}) };
}

export function flattenMany(resources: JsonApiResource[] | undefined): Record<string, unknown>[] {
  return (resources ?? []).map((r) => flatten(r)).filter((r): r is Record<string, unknown> =>
    r !== undefined
  );
}

/** Drop keys the caller left unset, so a create/update never sends an explicit blank for a field the caller never touched. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== "") out[k] = v;
  }
  return out;
}

/** Parse a `key: value` JSON object param (accepted as a JSON string or already-parsed object). */
export function parseJsonObject(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("expected a JSON object of key/value pairs");
  }
  return parsed as Record<string, unknown>;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * NationBuilder's two documented error envelopes (`core/api-v2-concepts`,
 * fetched 2026-09-15): a validation failure is `{ errors: [{ detail, title,
 * code, source, meta }] }` (422); everything else is the flat
 * `{ code, message }` shape. `rate_limited` responses are `{ message }` with
 * no `code`. This reads whichever shape is actually present rather than
 * assuming one.
 */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as {
      errors?: Array<{ detail?: string; title?: string; code?: string }>;
      message?: string;
      code?: string;
    };
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      return body.errors
        .map((e) => e.detail ?? e.title ?? e.code ?? "")
        .filter(Boolean)
        .join("; ");
    }
    if (body.message) return body.code ? `${body.code}: ${body.message}` : body.message;
  } catch {
    // Not JSON — fall through to the raw text below.
  }
  return text.slice(0, 500);
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /**
   * `filter[key]=value` pairs, JSON:API style (`core/api-v2-concepts`). A key
   * may itself carry an operator suffix documented by NationBuilder — e.g.
   * `"donations_amount_in_cents][gt"` — since it is written verbatim inside
   * `filter[...]`.
   */
  filter?: Record<string, unknown>;
  body?: Record<string, unknown>;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook.
 */
export class NationBuilderClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(slugFromConnection(ctx.connection));
  }

  async request<T = JsonApiDocument>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    for (const [k, v] of Object.entries(options.filter ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(`filter[${k}]`, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `NationBuilder ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${
          errorMessage(detail)
        }`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/** Build a JSON:API create/update request body: `{ data: { type, id?, attributes } }`. */
export function dataEnvelope(
  type: string,
  attributes: Record<string, unknown>,
  id?: string,
): { data: { type: string; id?: string; attributes: Record<string, unknown> } } {
  return { data: { type, ...(id ? { id } : {}), attributes: compact(attributes) } };
}
