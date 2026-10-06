import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Salesmate gives every account its own host — `acme.salesmate.io` — with the
 * API under `/apis`. The v4 reference's example header is
 * `x-linkname: demo.salesmate.io` and every request URL is
 * `https://link_name.salesmate.io/apis/...`.
 *
 * A static manifest cannot enumerate per-account hosts, so `w6w.network.allow`
 * declares `*.salesmate.io`. That is a wide net, so the link name itself is
 * validated: a single DNS label (letters, digits, hyphen), which means it can
 * only ever produce a host *directly* under `salesmate.io` — never a path,
 * port, userinfo or second domain smuggled in through the field.
 */
export const LINKNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

export function assertLinkname(linkname: unknown): string {
  if (typeof linkname !== "string" || !LINKNAME_PATTERN.test(linkname)) {
    throw new Error(
      "Invalid Salesmate link name — use only the subdomain from `acme.salesmate.io` (e.g. `acme`).",
    );
  }
  return linkname;
}

export function hostFor(linkname: string): string {
  return `${assertLinkname(linkname)}.salesmate.io`;
}

export function baseUrl(linkname: string): string {
  return `https://${hostFor(linkname)}/apis`;
}

export function linknameFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { linkname?: string };
  if (display.linkname) return assertLinkname(display.linkname);
  throw new Error(
    "Salesmate connection has no link name — reconnect the account so it can be recorded.",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** Salesmate's envelope: `{ Status: "success", Data }` or `{ Status: "failure", Error }`. */
export interface Envelope<T = unknown> {
  Status?: string;
  Data?: T;
  Error?: { Code?: string; Name?: string; Message?: string; name?: string; message?: string };
}

/** The vendor's own error text — the docs capitalise the keys, the live API lowercases them. */
export function errorMessage(body: Envelope | undefined, fallback: string): string {
  const e = body?.Error;
  return e?.Message || e?.message || e?.Name || e?.name || fallback;
}

/** Drop keys the caller left unset so an update doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Parse a JSON-typed form param (object, array, or a JSON string of one). */
export function parseJson(raw: unknown, name: string): unknown {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`\`${name}\` must be valid JSON.`);
  }
}

/**
 * Custom fields travel as top-level keys named by the field's API name (the
 * Company sample body carries `textCustomField8`, `companySingleLookupCustomField2`
 * beside `name`/`owner`), so they are merged into the body — standard fields win.
 */
export function customFields(raw: unknown): Record<string, unknown> {
  const parsed = parseJson(raw, "customFields");
  if (parsed === undefined) return {};
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error('`customFields` must be a JSON object, e.g. { "textCustomField1": "x" }.');
  }
  return parsed as Record<string, unknown>;
}

/**
 * Thin wrapper over `ctx.fetch`. It sets `x-linkname` (an account identifier,
 * not a secret — and needed on unsigned health probes too) but never the access
 * token: the runtime routes every request through the auth `sign` hook.
 */
export class SalesmateClient {
  private base: string;
  private host: string;

  constructor(private ctx: HookContext) {
    const linkname = linknameFromConnection(ctx.connection);
    this.base = baseUrl(linkname);
    this.host = hostFor(linkname);
  }

  /** Returns the envelope's `Data`; throws on HTTP errors and on `Status: "failure"`. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", "x-linkname": this.host };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    let body: Envelope<T> | undefined;
    try {
      body = text ? JSON.parse(text) as Envelope<T> : undefined;
    } catch {
      body = undefined;
    }
    if (!res.ok || body?.Status === "failure") {
      throw new Error(
        `Salesmate ${res.status} for ${init.method} ${url.pathname}: ${
          errorMessage(body, text.slice(0, 200) || res.statusText)
        }`,
      );
    }
    return body?.Data as T;
  }
}
