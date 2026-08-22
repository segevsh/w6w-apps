import type { HookContext } from "@w6w/types";

/**
 * Typesense — built against the vendor's own OpenAPI spec (v30) and its
 * cluster-operations documentation, read on 2026-08-19.
 *
 * ## Every deployment is its own host
 *
 * Typesense is a search engine people run: self-hosted on port **8108** by
 * default, or on Typesense Cloud at a hostname of their own. There is no
 * shared API endpoint, which is why the allowlist is `*` and why the health
 * checks are connection-scoped.
 *
 * ## The credential is a header, not a bearer token
 *
 * `X-TYPESENSE-API-KEY`. A client that sends `Authorization: Bearer` gets a
 * 401 that says nothing about the header being wrong.
 *
 * ## A bulk import returns 200 when every document failed
 *
 * This is the one to know. `POST /documents/import` answers **200** with a
 * JSONL body, one line per document:
 *
 *     {"success": true}
 *     {"success": false, "error": "Bad JSON.", "document": "[bad doc"}
 *
 * The spec is explicit that a failure "does not affect the other documents".
 * So a workflow checking the HTTP status believes an import of ten thousand
 * documents succeeded when none of them landed. `parseImportResult` reads
 * every line, and `document-import` fails loudly on a partial write.
 *
 * ## Search silently answers a different question when results are thin
 *
 * Two defaults, both from the spec:
 *
 * - **`drop_tokens_threshold` (default 10)** — if a query returns fewer than
 *   ten results, Typesense *drops words from the query* until it finds
 *   enough. A search for four specific words can come back with documents
 *   matching two of them, ranked as though they matched.
 * - **`typo_tokens_threshold` (default 100)** — under a hundred results, it
 *   starts allowing more typos.
 *
 * Both make a demo look good and make a workflow's precision guarantees
 * false. `document-search` exposes both and says what they do, because the
 * behaviour is invisible in the response: nothing marks a hit as having
 * matched a shortened query.
 */

/** The port a self-hosted Typesense listens on unless told otherwise. */
export const DEFAULT_PORT = 8108;

export type QueryValue = string | number | boolean | undefined | null;

/** Coerce loosely-typed action params into query-string values, dropping empties. */
export function query(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "number" || typeof v === "boolean" ? v : String(v);
  }
  return out;
}

/** Drop keys the caller left unset. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
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

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * Normalise a node address.
 *
 * A bare hostname gets `https://` and port **8108**, which is what a
 * self-hosted Typesense listens on. Typesense Cloud hands out a hostname
 * served on 443, so an explicit port or a URL is left alone — getting this
 * wrong produces a connection refused that reads as the server being down.
 */
export function normalizeHost(value: unknown): string {
  const raw = String(value ?? "").trim().replace(/\/+$/, "");
  if (!raw) throw new Error("a Typesense host is required");
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`\`${raw}\` is not a usable host`);
  }
  if (!url.port && !/^https?:\/\//i.test(raw)) url.port = String(DEFAULT_PORT);
  return `${url.protocol}//${url.host}`;
}

/** Which node a connection speaks to. */
export function hostFromConnection(connection: unknown): string {
  const display = (connection as { display?: Record<string, unknown> } | undefined)?.display;
  const host = String(display?.host ?? "").trim();
  if (!host) {
    throw new Error(
      "this connection has no Typesense host recorded — every Typesense deployment is its own " +
        "server, so there is no default to fall back to. Reconnect to record one",
    );
  }
  return host;
}

/** One line of an import response. */
export interface ImportLine {
  success: boolean;
  error?: string;
  document?: unknown;
  id?: string;
}

/**
 * Read the JSONL body a bulk import returns.
 *
 * Each line is one document, in the order they were sent. The HTTP status is
 * 200 whether every line succeeded or none did.
 */
export function parseImportResult(body: string): {
  lines: ImportLine[];
  succeeded: number;
  failed: ImportLine[];
} {
  const lines: ImportLine[] = [];
  for (const line of body.split("\n")) {
    const text = line.trim();
    if (!text) continue;
    try {
      lines.push(JSON.parse(text) as ImportLine);
    } catch {
      // A line that is not JSON is a failure this app must not swallow.
      lines.push({
        success: false,
        error: `unparseable import response line: ${text.slice(0, 120)}`,
      });
    }
  }
  return {
    lines,
    succeeded: lines.filter((line) => line.success).length,
    failed: lines.filter((line) => !line.success),
  };
}

/** Turn a Typesense error into something actionable. */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    detail = (JSON.parse(text) as { message?: string })?.message ?? detail;
  } catch { /* not JSON */ }

  if (status === 401) {
    return `${detail || "unauthorized"} — Typesense takes its key in the ` +
      "`X-TYPESENSE-API-KEY` header, not as a bearer token, and answers the same 401 either way. " +
      "A scoped search key also 401s on anything but search";
  }
  if (status === 404) {
    return `${detail || "not found"} — a collection name is case-sensitive, and an ALIAS is ` +
      "resolved only where the API documents one, so a name that works in search may 404 here";
  }
  if (status === 409) {
    return `${detail || "conflict"} — the resource already exists. Typesense has no create-or-` +
      "update on collections: an existing collection must be dropped, or written to under a new " +
      "name and swapped in with an alias";
  }
  if (status === 422) {
    return `${detail || "unprocessable"} — the document does not fit the collection's schema. ` +
      "Typesense is strict by default: a field typed `int32` rejects a string, and an unknown " +
      "field is rejected unless the schema declares a `.*` catch-all";
  }
  if (status === 503) {
    return `${detail || "unavailable"} — the node is not ready to serve. On a cluster this is a ` +
      "node that has lost quorum or is still catching up, and it is worth reading `/health`, " +
      "which reports OUT_OF_DISK and OUT_OF_MEMORY explicitly";
  }
  return detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Import and export speak JSONL, not JSON. */
  jsonl?: string;
  text?: boolean;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the key — the runtime routes
 * every request through the auth `sign` hook.
 */
export class TypesenseClient {
  private host: string;

  constructor(private ctx: HookContext, host?: string) {
    this.host = host ?? hostFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.host}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: options.text ? "*/*" : "application/json",
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.jsonl !== undefined) {
      headers["content-type"] = "text/plain";
      init.body = options.jsonl;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(
        `Typesense ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }

    if (res.status === 204 || !text) return undefined as T;
    if (options.text) return text as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Typesense did not return JSON: ${text.slice(0, 160)}`);
    }
  }
}
