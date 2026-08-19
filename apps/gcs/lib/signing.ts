import { sha256Hex } from "./crypto.ts";

/**
 * V4 signed URLs.
 *
 * ## Why this is the most useful thing in the app
 *
 * A signed URL lets somebody who has no Google credentials read or write one
 * object, for a bounded time, over plain HTTPS. That is how a workflow hands a
 * file to a customer, or gives a browser somewhere a place to upload to,
 * without ever proxying the bytes through itself or issuing a credential.
 *
 * Nothing about the URL is registered anywhere — Cloud Storage validates the
 * signature when the URL is used. Which has a consequence worth stating
 * plainly: **a signed URL cannot be revoked.** It is valid until it expires,
 * for anybody who has it. There is no list of outstanding URLs and no way to
 * cancel one; the only remedies are to delete the object or, in extremis,
 * rotate the key that signed it — which invalidates every URL that key ever
 * signed.
 *
 * ## The signature is produced by Google, not here
 *
 * Signing needs the service account's private key, and an action never sees a
 * credential — that is a rule of the app sandbox, not a preference. So the
 * string-to-sign is built here, where it needs no secret at all, and the
 * signing itself is done by **IAM Credentials' `signBlob`**, which signs with
 * the service account's key using the ordinary access token the auth hook
 * already attaches.
 *
 * That costs one API call and needs the caller to hold **Service Account Token
 * Creator** on itself — a permission that is separate from any Cloud Storage
 * role, and whose absence is a 403 from a host the workflow was not expecting
 * to talk to.
 *
 * ## The algorithm, and where implementations go wrong
 *
 * Google's V4 scheme mirrors AWS SigV4:
 *
 * 1. A **canonical request** — method, percent-encoded path, sorted query
 *    string, canonical headers, signed-header list, and the literal payload
 *    hash `UNSIGNED-PAYLOAD`.
 * 2. A **string to sign** — `GOOG4-RSA-SHA256`, the timestamp, the credential
 *    scope, and the SHA-256 of the canonical request.
 * 3. The signature — RSA-SHA256 over that, as lowercase hex.
 *
 * The details that are easy to get wrong, all of which this handles:
 *
 * - **`host` must be a signed header.** A signature over no headers verifies
 *   against nothing and Cloud Storage rejects it.
 * - **The path is percent-encoded except for its slashes.** An object called
 *   `a/b c.txt` signs as `/bucket/a/b%20c.txt`, not `%2Fb`.
 * - **The query string must be sorted and encoded before hashing**, and the
 *   `X-Goog-Signature` is appended afterwards — signing a query that already
 *   contains the signature is circular.
 * - **The maximum lifetime is 7 days.** Longer is rejected at use time, not at
 *   signing time, so a URL made with a 30-day expiry looks fine and fails
 *   later.
 */

/** Google's ceiling on a V4 signed URL's lifetime. */
export const MAX_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

export interface SignedUrlOptions {
  bucket: string;
  object: string;
  method: string;
  expiresInSeconds: number;
  clientEmail: string;
  /** Milliseconds since the epoch. Injected so the result is testable. */
  now: number;
  /** Extra headers the caller must send, which become signed headers. */
  headers?: Record<string, string>;
  /**
   * Produce the RSA-SHA256 signature over the string-to-sign, as lowercase
   * hex. In the app this calls IAM Credentials; in the tests it signs with a
   * local key, which is what lets the canonical construction be checked
   * against an independently computed vector.
   */
  sign: (stringToSign: string) => Promise<string>;
}

/**
 * Percent-encode a path segment the way V4 wants: everything except the
 * unreserved set, with `/` left alone because it separates segments.
 */
export function encodePath(name: string): string {
  return name.split("/").map((segment) =>
    encodeURIComponent(segment).replace(
      /[!'()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    )
  ).join("/");
}

/** `YYYYMMDD'T'HHMMSS'Z'`, which is the only timestamp format V4 accepts. */
export function basicIsoTimestamp(now: number): string {
  return new Date(now).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Build a V4 signed URL.
 *
 * Everything here is arithmetic on public values — the bucket, the object
 * name, the timestamp and the service account's email address. No secret
 * enters this function; `options.sign` is where the key is used, and it is
 * somebody else's problem.
 */
export async function signedUrl(options: SignedUrlOptions): Promise<{
  url: string;
  expiresAt: string;
  signedHeaders: string[];
}> {
  const expires = Math.floor(options.expiresInSeconds);
  if (!Number.isFinite(expires) || expires <= 0) {
    throw new Error("`expiresIn` must be a positive number of seconds");
  }
  if (expires > MAX_EXPIRY_SECONDS) {
    throw new Error(
      `\`expiresIn\` is ${expires} seconds and Google's maximum for a V4 signed URL is ` +
        `${MAX_EXPIRY_SECONDS} (7 days). A longer one signs successfully and is refused when ` +
        "somebody tries to use it, which is a failure nobody sees until then",
    );
  }

  const timestamp = basicIsoTimestamp(options.now);
  const datestamp = timestamp.slice(0, 8);
  const scope = `${datestamp}/auto/storage/goog4_request`;

  // `host` must be signed; a signature over no headers verifies against nothing.
  const headers: Record<string, string> = { host: "storage.googleapis.com", ...options.headers };
  const headerNames = Object.keys(headers).map((h) => h.toLowerCase()).sort();
  const canonicalHeaders = headerNames
    .map((name) => `${name}:${String(headers[name] ?? headers[name.toLowerCase()]).trim()}\n`)
    .join("");
  const signedHeaders = headerNames.join(";");

  const queryParams: Record<string, string> = {
    "X-Goog-Algorithm": "GOOG4-RSA-SHA256",
    "X-Goog-Credential": `${options.clientEmail}/${scope}`,
    "X-Goog-Date": timestamp,
    "X-Goog-Expires": String(expires),
    "X-Goog-SignedHeaders": signedHeaders,
  };
  const canonicalQuery = Object.keys(queryParams).sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join("&");

  const canonicalPath = `/${options.bucket}/${encodePath(options.object)}`;
  const canonicalRequest = [
    options.method.toUpperCase(),
    canonicalPath,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    // The literal string, not a hash of anything — the body is not signed.
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "GOOG4-RSA-SHA256",
    timestamp,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signature = await options.sign(stringToSign);

  return {
    // The signature is appended after the canonical query was hashed.
    url: `https://storage.googleapis.com${canonicalPath}?${canonicalQuery}` +
      `&X-Goog-Signature=${signature}`,
    expiresAt: new Date(options.now + expires * 1000).toISOString(),
    signedHeaders: headerNames,
  };
}

/**
 * Sign a string with the service account's key, via IAM Credentials.
 *
 * `POST iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/{email}
 * :signBlob` takes base64 and returns base64; a V4 signature is transmitted as
 * lowercase hex, so it is re-encoded here.
 *
 * `projects/-` is not a placeholder to fill in — the literal hyphen means "work
 * the project out from the service account", and substituting a real project id
 * also works but is unnecessary.
 *
 * The permission needed is `iam.serviceAccounts.signBlob`, from the **Service
 * Account Token Creator** role, held by the service account *on itself*. It is
 * unrelated to any Cloud Storage role, so an account that can read and write
 * every object in a bucket will still get a 403 here until somebody grants it.
 */
export const IAM_CREDENTIALS_HOST = "https://iamcredentials.googleapis.com";

export function signWithIam(
  fetchImpl: (url: string, init: RequestInit) => Promise<Response>,
  clientEmail: string,
): (stringToSign: string) => Promise<string> {
  return async (stringToSign: string) => {
    const url = `${IAM_CREDENTIALS_HOST}/v1/projects/-/serviceAccounts/${
      encodeURIComponent(clientEmail)
    }:signBlob`;
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ payload: encodeBase64(stringToSign) }),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      let detail = text.slice(0, 240);
      try {
        detail = (JSON.parse(text) as { error?: { message?: string } })?.error?.message ?? detail;
      } catch { /* not JSON */ }
      throw new Error(
        `IAM Credentials ${res.status} while signing: ${detail}` +
          (res.status === 403
            ? " — this needs the Service Account Token Creator role held by the service account " +
              "ON ITSELF, which is separate from every Cloud Storage role"
            : ""),
      );
    }
    const body = JSON.parse(text) as { signedBlob?: string };
    if (!body?.signedBlob) throw new Error("IAM Credentials returned no signature");
    // base64 in, base64 out, and a V4 signature travels as hex.
    return base64ToHex(body.signedBlob);
  };
}

/** Standard base64, which is what signBlob's `payload` wants. */
export function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** Re-encode signBlob's base64 answer as the lowercase hex a V4 URL carries. */
export function base64ToHex(value: string): string {
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
  let out = "";
  for (let i = 0; i < binary.length; i++) {
    out += binary.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return out;
}
