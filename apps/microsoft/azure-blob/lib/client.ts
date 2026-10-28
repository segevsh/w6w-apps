import type { HookContext, RedactedConnection } from "@w6w/types";
import { child, children, parseXml, text, toRecord, type XmlNode } from "./xml.ts";

/**
 * Azure Blob Storage's REST API — verified against Microsoft's REST
 * documentation and probed live against a public storage account on
 * 2026-08-19.
 *
 * ## It answers XML, and there is no JSON option
 *
 * Every other app in this pack parses JSON. There is no `Accept` header that
 * changes this one: `List Containers`, `List Blobs`, and every error, come back
 * as XML. See `lib/xml.ts` for the reader and why it is deliberately not a
 * general parser.
 *
 * ## The account is the hostname
 *
 * `https://{account}.blob.core.windows.net`. There is no global endpoint and no
 * account parameter — the account name is DNS, which is why it is part of the
 * credential rather than a field on each action, and why a typo produces a name
 * resolution failure rather than a 404.
 *
 * ## Containers are flat, and so are blobs inside them
 *
 * An account holds containers; a container holds blobs. That is the entire
 * hierarchy — a container cannot hold a container. Blob names contain slashes
 * and the folder-shaped view is synthesised with `prefix` and `delimiter`,
 * exactly as in `apps/gcs`, with the synthetic directories arriving in
 * `<BlobPrefix>` elements rather than alongside the blobs.
 *
 * ## Every request carries `x-ms-version`, and it decides the semantics
 *
 * Not just the response shape: the version changes signing rules — the
 * empty-versus-zero `Content-Length` behaviour changed at 2015-02-21 — and
 * which features exist. An omitted version header falls back to a very old
 * default.
 *
 * ## Errors are XML with the reason in a header
 *
 * The body is `<Error><Code>…</Code><Message>…</Message></Error>`, and the same
 * code is repeated in the **`x-ms-error-code`** response header. The header is
 * the more reliable of the two, because an error can arrive with an empty body
 * — a HEAD request, most obviously, which is how blob existence is checked.
 */

/** Where the Blob service lives, per account. */
export const HOST_SUFFIX = ".blob.core.windows.net";

/** Public (redacted-safe) connection metadata. */
export interface AzureConnectionDisplay {
  /** The storage account name. It is the hostname. */
  account?: string;
}

/** The origin for an account. */
export function accountHost(account: string): string {
  return `https://${account}${HOST_SUFFIX}`;
}

/**
 * A storage account name, checked for the shapes that fail confusingly.
 *
 * Azure account names are 3–24 characters, lowercase letters and digits only.
 * A name with a dot in it is somebody pasting the hostname, which would produce
 * `https://myaccount.blob.core.windows.net.blob.core.windows.net`.
 */
export function accountName(value: unknown, field = "account"): string {
  let name = String(value ?? "").trim().toLowerCase();
  if (!name) throw new Error(`\`${field}\` is required`);
  if (name.startsWith("https://")) name = name.slice(8);
  // The path first: stripping the host suffix before the path leaves the
  // suffix behind on a full URL like `https://acct.blob.core.windows.net/c`.
  name = name.replace(/\/.*$/, "");
  if (name.endsWith(HOST_SUFFIX)) name = name.slice(0, -HOST_SUFFIX.length);
  if (!/^[a-z0-9]{3,24}$/.test(name)) {
    throw new Error(
      `\`${field}\` must be a storage account name — 3 to 24 lowercase letters and digits, and ` +
        `nothing else. Got "${name}". The account name is the first label of the hostname, not ` +
        "the whole hostname and not a container",
    );
  }
  return name;
}

/** The account for this connection. */
export function accountFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as AzureConnectionDisplay;
  const account = String(display.account ?? "").trim();
  if (!account) {
    throw new Error(
      "this connection has no storage account recorded — reconnect it, because the account name " +
        "is the hostname and nothing can be addressed without it",
    );
  }
  return account;
}

/** A container name: 3–63 characters, lowercase, digits and single hyphens. */
export function containerName(value: unknown, field = "container"): string {
  const name = String(value ?? "").trim();
  if (!name) throw new Error(`\`${field}\` is required`);
  if (!/^[a-z0-9]([a-z0-9]|-(?!-)){1,61}[a-z0-9]$/.test(name)) {
    throw new Error(
      `\`${field}\` must be a container name — 3 to 63 characters, lowercase letters, digits and ` +
        `single hyphens, starting and ending with a letter or digit. Got "${name}". Azure ` +
        "rejects uppercase outright, which catches most names copied from elsewhere",
    );
  }
  return name;
}

/** A blob name. Slashes are ordinary characters in it. */
export function blobName(value: unknown, field = "blob"): string {
  const name = String(value ?? "").trim();
  if (!name) throw new Error(`\`${field}\` is required`);
  return name;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Extra `x-ms-*` headers, which are signed. */
  headers?: Record<string, string>;
  /** A body, sent verbatim with this content type. */
  body?: { content: string; contentType: string };
  /** Return the body as text rather than parsing it as XML. */
  text?: boolean;
}

/** What came back, keeping the headers — much of Azure's data is in them. */
export interface Result<T> {
  data: T;
  headers: Record<string, string>;
  status: number;
}

/** Drop keys the caller left unset, so a default is not overwritten with nothing. */
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

/** Coerce a params bag into query values, dropping what was left unset. */
export function query(input: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "boolean" || typeof v === "number" ? v : String(v);
  }
  return out;
}

/**
 * Thin wrapper over `ctx.fetch`. It never signs — the runtime routes every
 * request through the auth `sign` hook, which is where the account key lives.
 */
export class BlobClient {
  readonly account: string;
  readonly host: string;

  constructor(private ctx: HookContext, account?: string) {
    this.account = account ?? accountFromConnection(ctx.connection);
    this.host = accountHost(this.account);
  }

  /** The parsed XML tree, or the text for a blob's contents. */
  async request<T = XmlNode>(path: string, options: RequestOptions = {}): Promise<T> {
    return (await this.full<T>(path, options)).data;
  }

  /** The same, keeping the response headers — where much of Azure's data is. */
  async full<T = XmlNode>(path: string, options: RequestOptions = {}): Promise<Result<T>> {
    const url = new URL(`${this.host}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body) {
      headers["content-type"] = options.body.contentType;
      init.body = options.body.content;
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, name) => (responseHeaders[name.toLowerCase()] = value));
    const raw = await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(
        `Azure Blob ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, raw, responseHeaders["x-ms-error-code"])
        }`,
      );
    }

    if (options.text) {
      return { data: raw as T, headers: responseHeaders, status: res.status };
    }
    // A HEAD, or a 202/204, has no body — and that is normal here, because
    // Azure puts the answer in the headers for those.
    if (!raw.trim()) {
      return {
        data: { text: "", children: {} } as unknown as T,
        headers: responseHeaders,
        status: res.status,
      };
    }
    return { data: parseXml(raw) as unknown as T, headers: responseHeaders, status: res.status };
  }
}

/** Read a listing's blobs and the synthetic directories beside them. */
export function readBlobList(root: XmlNode): {
  blobs: Array<Record<string, unknown>>;
  prefixes: string[];
  nextMarker?: string;
} {
  const results = child(root, "EnumerationResults");
  const list = child(results, "Blobs");

  const blobs = children(list, "Blob").map((blob) => ({
    name: text(blob, "Name"),
    ...toRecord(child(blob, "Properties")),
  }));
  // Synthetic directories, present only when a delimiter was given — and in
  // their own element rather than among the blobs.
  const prefixes = children(list, "BlobPrefix")
    .map((entry) => text(entry, "Name"))
    .filter((name): name is string => Boolean(name));

  const marker = text(results, "NextMarker");
  return { blobs, prefixes, nextMarker: marker || undefined };
}

/**
 * Turn an Azure error into something actionable.
 *
 * The code is in the body *and* in the `x-ms-error-code` header, and the header
 * survives an empty body — which a failed HEAD always has.
 */
export function describeError(status: number, body: string, headerCode?: string): string {
  let code = headerCode ?? "";
  let message = "";
  try {
    const root = parseXml(body);
    code = code || text(root, "Error", "Code") || "";
    message = text(root, "Error", "Message") || "";
  } catch { /* an error with an unparseable body still has the header */ }

  // Azure's messages carry a RequestId and a timestamp on their own lines,
  // which is noise in a workflow's error.
  const detail = message.split("\n")[0].trim() || body.slice(0, 200);
  const tail = code ? ` [${code}]` : "";

  if (code === "AuthenticationFailed") {
    return `${detail}${tail} — the Shared Key signature did not match. Azure echoes the string ` +
      "it built in the error's own detail, which is the only practical way to see which line " +
      "differs; the usual causes are a Content-Length of `0` where an empty string is required, " +
      "and the account key used as text rather than base64-decoded";
  }
  if (status === 403) {
    return `${detail}${tail} — authorized but not permitted, or the signature is stale. Azure ` +
      "rejects a request whose x-ms-date is more than 15 minutes from its own clock, which " +
      "presents as a permission problem rather than a clock problem";
  }
  if (code === "ContainerNotFound") {
    return `${detail}${tail} — no such container. Container names are case-sensitive in the URL ` +
      "and must be lowercase, so a name with capitals is a 404 rather than a validation error";
  }
  if (code === "BlobNotFound" || status === 404) {
    return `${detail}${tail} — not found. A blob name's slashes are ordinary characters and must ` +
      "be encoded into the path; an unencoded one addresses a different URL";
  }
  if (code === "ContainerBeingDeleted") {
    return `${detail}${tail} — the container is still being deleted, and the name cannot be ` +
      "reused until that finishes. It takes at least 30 seconds and can take much longer";
  }
  if (status === 409) {
    return `${detail}${tail} — a conflict. Either the resource already exists, or a lease is ` +
      "held on it by somebody else";
  }
  if (status === 412) {
    return `${detail}${tail} — a precondition failed, which means it worked: the blob either ` +
      "already existed, or has changed since it was read";
  }
  if (status === 429 || status === 503) {
    return `${detail}${tail} — throttled. A single blob supports far less throughput than a ` +
      "container does, so this is usually repeated writes to one name rather than overall volume";
  }
  return `${detail}${tail}` || `${status}`;
}
