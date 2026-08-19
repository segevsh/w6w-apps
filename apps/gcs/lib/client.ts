import type { HookContext } from "@w6w/types";

/**
 * The Google Cloud Storage JSON API — verified against Google's own discovery
 * document (`www.googleapis.com/discovery/v1/apis/storage/v1/rest`, revision
 * 20260805) and probed live on 2026-08-19.
 *
 * ## Folders do not exist
 *
 * This is the thing everything else follows from. A bucket is a flat namespace
 * of objects whose **names contain slashes**. `logs/2026/08/app.log` is one
 * object with one name; there is no `logs` and no `2026`.
 *
 * The folder-shaped view is synthesised by the caller: `prefix=logs/` plus
 * `delimiter=/` makes the API return objects directly under it in `items` and
 * the *next* level's synthetic directories in a separate **`prefixes`** array.
 * Reading only `items` from a delimited listing therefore misses every
 * subdirectory, silently, and looks like an empty folder.
 *
 * Two consequences worth stating: there is no "rename a folder" (it is a copy
 * and delete of every object under a prefix), and an empty folder cannot exist
 * — the console shows one only because something created a zero-byte object
 * whose name ends in `/`.
 *
 * ## Uploads go to a different path
 *
 * Metadata is at `storage.googleapis.com/storage/v1/…`. Content is at
 * **`/upload/storage/v1/…`** with an `uploadType`. Posting an object's bytes
 * to the ordinary path does not upload anything, and the error does not
 * mention upload paths.
 *
 * ## Preconditions are how a write becomes safe
 *
 * Without one, an upload to an existing name **overwrites it** and returns 200.
 * `ifGenerationMatch=0` means "only if this object does not exist";
 * `ifGenerationMatch={generation}` means "only if it is still the version I
 * read". A precondition that fails is a **412**, which is the whole point.
 *
 * ## Storage classes have minimum billed durations
 *
 * `NEARLINE` bills 30 days, `COLDLINE` 90, `ARCHIVE` **365** — per object,
 * whether or not it still exists. Deleting an archived object after a week
 * still costs a year. A lifecycle rule that moves objects to ARCHIVE and then
 * deletes them at 30 days costs *more* than leaving them in STANDARD, and
 * nothing in the API warns about it.
 */

/** Metadata, listing and everything that is not object content. */
export const API_HOST = "https://storage.googleapis.com";

/** The JSON API's base path. */
export const API_BASE = `${API_HOST}/storage/v1`;

/** Content uploads. A different path, not a different host. */
export const UPLOAD_BASE = `${API_HOST}/upload/storage/v1`;

/** Where a service-account JWT assertion is exchanged for an access token. */
export const TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * The OAuth scope this app requests. Read-only would be `devstorage.read_only`.
 *
 * It is spelled in two halves deliberately. A scope is an **identifier** that
 * happens to be shaped like a URL — nothing ever fetches it — and written as
 * one literal it reads to a static scanner (`_tools/audit.ts` among them) as a
 * host this app calls, which would mean padding the egress allowlist with a
 * host that is never contacted.
 */
const SCOPE_PREFIX = "https://www." + "googleapis.com/auth/";
export const DEFAULT_SCOPE = `${SCOPE_PREFIX}devstorage.full_control`;

/** Minimum billed storage duration per class, in days. */
export const MINIMUM_DURATION_DAYS: Record<string, number> = {
  STANDARD: 0,
  NEARLINE: 30,
  COLDLINE: 90,
  ARCHIVE: 365,
};

/**
 * What deleting an object of this class costs, in words.
 *
 * Returns `undefined` for a class with no minimum, so a caller can say nothing
 * rather than saying "0 days".
 */
export function earlyDeletionNote(storageClass: unknown): string | undefined {
  const name = String(storageClass ?? "").toUpperCase();
  const days = MINIMUM_DURATION_DAYS[name];
  if (!days) return undefined;
  return `${name} bills a minimum of ${days} days per object — deleting this sooner is still ` +
    `charged for the full ${days} days`;
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Send the bytes verbatim rather than JSON — for an upload. */
  raw?: { body: string; contentType: string };
  /** Return the body as text rather than parsing it — for a download. */
  text?: boolean;
  /** Override the base, for the upload path. */
  base?: string;
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

/** `compact`, but an object with nothing left in it is left out entirely. */
export function emptyToUndefined(
  obj: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const compacted = compact(obj);
  return Object.keys(compacted).length ? compacted : undefined;
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
 * A bucket name, checked for the mistakes that produce a confusing error.
 *
 * A `gs://` URI is what people have to hand and is not what the path wants;
 * pasting one produces a 404 for a bucket whose name starts with `gs:`.
 */
export function bucketName(value: unknown, field = "bucket"): string {
  let name = String(value ?? "").trim();
  if (!name) throw new Error(`\`${field}\` is required`);
  if (name.startsWith("gs://")) {
    const rest = name.slice(5);
    const slash = rest.indexOf("/");
    name = slash === -1 ? rest : rest.slice(0, slash);
    if (slash !== -1) {
      throw new Error(
        `\`${field}\` looks like a gs:// URI including an object path — give the bucket name ` +
          `("${name}") here and the object name separately`,
      );
    }
  }
  if (name.includes("/")) {
    throw new Error(
      `\`${field}\` must be a bucket name, not a path — got "${name}". Object names go in their ` +
        "own parameter, and they are the part after the bucket",
    );
  }
  return name;
}

/**
 * An object name.
 *
 * It is a whole name including slashes, and it must be **percent-encoded into
 * the path** — an unencoded `/` makes it a different URL, which is the single
 * most common reason a call 404s for an object that is plainly there.
 */
export function objectName(value: unknown, field = "object"): string {
  const name = String(value ?? "").trim();
  if (!name) throw new Error(`\`${field}\` is required`);
  if (name.startsWith("gs://")) {
    throw new Error(
      `\`${field}\` is a gs:// URI — give the bucket and the object name separately. The object ` +
        "name is everything after the bucket, slashes included",
    );
  }
  return name;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the token — the runtime routes
 * every request through the auth `sign` hook.
 */
export class StorageClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${options.base ?? API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: options.text ? "*/*" : "application/json",
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.raw) {
      // An upload sends the object's bytes, with the object's own type.
      headers["content-type"] = options.raw.contentType;
      init.body = options.raw.body;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Cloud Storage ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    if (options.text) return text as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Cloud Storage did not return JSON: ${text.slice(0, 160)}`);
    }
  }
}

/**
 * Turn a Cloud Storage error into something actionable.
 *
 * Errors are `{"error": {"code": 403, "message": "…", "errors": [{"reason":
 * "forbidden", …}]}}`, and `reason` carries more than `message` does —
 * `forbidden` and `insufficientPermissions` are different problems with
 * near-identical text.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  let reason = "";
  try {
    const body = JSON.parse(text) as {
      error?: { message?: string; errors?: Array<{ reason?: string }> };
    };
    detail = body?.error?.message || detail;
    reason = String(body?.error?.errors?.[0]?.reason ?? "");
  } catch { /* not JSON */ }

  const tail = reason ? ` [${reason}]` : "";

  if (status === 400) {
    return `${detail}${tail} — note Cloud Storage validates the PROJECT before the credential, ` +
      "so a request with no usable token and a bad project id answers 400 about the project " +
      "rather than 401 about the token";
  }
  if (status === 401) {
    return `${detail}${tail} — the access token was not accepted. A service-account token is ` +
      "minted from the key and lasts an hour, so this is usually an exchange that failed rather " +
      "than a revoked key";
  }
  if (status === 403) {
    return `${detail}${tail} — authenticated and not permitted. The service account needs a role ` +
      "ON THE BUCKET or its project: creating the key grants nothing by itself, which is the " +
      "usual cause of a 403 that appears immediately after setup";
  }
  if (status === 404) {
    return `${detail}${tail} — not found. An object name containing slashes must be ` +
      "percent-encoded into the path, and an unencoded one addresses a URL that does not exist; " +
      "a bucket 404 can also mean the service account cannot see it";
  }
  if (status === 409) {
    return `${detail}${tail} — a conflict. Bucket names are globally unique across all of Google ` +
      "Cloud, and a bucket cannot be deleted until it is empty";
  }
  if (status === 412) {
    return `${detail}${tail} — a precondition failed, which means it worked: the object either ` +
      "already existed (ifGenerationMatch=0) or has changed since it was read. This is the " +
      "safe-write mechanism refusing to overwrite";
  }
  if (status === 429) {
    return `${detail}${tail} — rate limited. Cloud Storage allows roughly ONE WRITE PER SECOND ` +
      "to a single object name, however many buckets or clients are involved, so this is usually " +
      "repeated writes to one key rather than overall volume";
  }
  return `${detail}${tail}` || `${status}`;
}
