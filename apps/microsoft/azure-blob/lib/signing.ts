/**
 * Shared Key authorization — Azure Storage's own signing scheme.
 *
 * The third distinct scheme in this pack, after AWS SigV4 (`apps/s3`) and
 * Google's V4 (`apps/gcs`), and the only one that can be done entirely inside
 * a `sign` hook: everything it needs is on the request being signed.
 *
 * ## The string to sign is twelve fixed lines, most of them empty
 *
 *     VERB \n Content-Encoding \n Content-Language \n Content-Length \n
 *     Content-MD5 \n Content-Type \n Date \n If-Modified-Since \n If-Match \n
 *     If-None-Match \n If-Unmodified-Since \n Range \n
 *     CanonicalizedHeaders CanonicalizedResource
 *
 * The positions are load-bearing. A missing line shifts everything after it and
 * produces a signature that is wrong in a way the 403 does not explain — the
 * error is `AuthenticationFailed`, and its detail echoes the string the *server*
 * built, which is the only practical way to debug this.
 *
 * ## Content-Length is an empty string when the body is empty
 *
 * Not `0`. This changed in version 2015-02-21 and it is the single most common
 * cause of a signature that verifies for GETs and fails for everything else.
 *
 * ## `Date` is blank because `x-ms-date` supersedes it
 *
 * When `x-ms-date` is present the service ignores `Date`, so the `Date` line
 * stays empty and the value appears in the canonicalized headers instead. Both
 * being filled in is a mismatch.
 *
 * ## Canonicalized headers: `x-ms-*` only, lowercased, sorted, one per line
 *
 * Each as `name:value\n`, including the last. Any other header — including
 * `Authorization` itself and `Content-Type`, which has its own line above — is
 * excluded.
 *
 * ## Canonicalized resource: the account, the path, then the query
 *
 * `/{account}{path}`, then for each query parameter, sorted by lowercased name,
 * a newline and `name:value`. The names are lowercased and the values are
 * URL-*decoded* — a signature built over the encoded form fails on any
 * parameter containing a space or a slash.
 */

/** The REST API version this app speaks. It goes in every request and signature. */
export const API_VERSION = "2021-12-02";

export interface SharedKeyInput {
  account: string;
  /** The account key, base64 as Azure issues it. */
  key: string;
  method: string;
  /** The path, beginning with a slash — no query string. */
  path: string;
  /** Query parameters, as sent. */
  query: Record<string, string>;
  /** All request headers. Only `x-ms-*` are canonicalized. */
  headers: Record<string, string>;
  /** Empty string when there is no body — NOT "0". */
  contentLength?: string;
  contentType?: string;
}

/**
 * Build the string to sign.
 *
 * Exported because it is the thing worth testing: a signature is opaque, and a
 * mismatch is only ever debugged by comparing this against what Azure echoes
 * back in its 403.
 */
export function stringToSign(input: SharedKeyInput): string {
  const ms: Record<string, string> = {};
  for (const [name, value] of Object.entries(input.headers)) {
    const lower = name.toLowerCase();
    // `x-ms-*` only. Content-Type has its own line and must not appear twice.
    if (lower.startsWith("x-ms-")) ms[lower] = String(value).trim();
  }
  const canonicalizedHeaders = Object.keys(ms).sort()
    .map((name) => `${name}:${ms[name]}\n`)
    .join("");

  // Lowercase the NAMES into a new map first. Lowercasing only for the sort
  // and then indexing the original by the lowered name silently signs an empty
  // value for any parameter that was not already lowercase.
  const lowered: Record<string, string> = {};
  for (const [name, value] of Object.entries(input.query)) {
    lowered[name.toLowerCase()] = String(value ?? "");
  }
  let canonicalizedResource = `/${input.account}${input.path}`;
  for (const name of Object.keys(lowered).sort()) {
    // The DECODED value — signing the encoded form fails on spaces and slashes.
    canonicalizedResource += `\n${name}:${lowered[name]}`;
  }

  return [
    input.method.toUpperCase(),
    "", // Content-Encoding
    "", // Content-Language
    input.contentLength ?? "", // empty when zero, not "0"
    "", // Content-MD5
    input.contentType ?? "",
    "", // Date — superseded by x-ms-date, which is in the headers below
    "", // If-Modified-Since
    "", // If-Match
    "", // If-None-Match
    "", // If-Unmodified-Since
    "", // Range
  ].join("\n") + "\n" + canonicalizedHeaders + canonicalizedResource;
}

/** Base64, from raw bytes. */
export function encodeBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** Decode the account key, which Azure issues as base64. */
export function decodeBase64(value: string): Uint8Array {
  const binary = atob(String(value ?? "").trim());
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * The `Authorization` header value: `SharedKey {account}:{base64 signature}`.
 *
 * HMAC-SHA256 over the UTF-8 string to sign, keyed with the **decoded** account
 * key. Using the base64 text as the key is a signature that never verifies and
 * an error that says only `AuthenticationFailed`.
 */
export async function sharedKeyAuthorization(input: SharedKeyInput): Promise<string> {
  let raw: Uint8Array;
  try {
    raw = decodeBase64(input.key);
  } catch {
    throw new Error(
      "the account key is not valid base64 — copy it from the storage account's Access keys " +
        "blade, which issues it base64-encoded, rather than typing it",
    );
  }
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    raw as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(stringToSign(input)),
  );
  return `SharedKey ${input.account}:${encodeBase64(new Uint8Array(signature))}`;
}

/** RFC 1123, which is the only date format Azure accepts. */
export function rfc1123(now: number): string {
  return new Date(now).toUTCString();
}
