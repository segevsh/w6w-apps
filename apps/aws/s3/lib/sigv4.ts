/**
 * AWS Signature Version 4 (SigV4) request signing — pure computation, no
 * network access. This is the only place in the app that touches the raw
 * AWS secret access key; it is imported exclusively by `auth/aws-iam.ts`'s
 * `sign` hook, which the runtime always runs network-less (see
 * `docs/build-a-w6w-app.md` invariant 5).
 *
 * Implements the algorithm exactly as published by AWS:
 * https://docs.aws.amazon.com/general/latest/gr/sigv4-signed-request-examples.html
 * https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html
 *
 * Verified against AWS's own published SigV4 test suite (the generic,
 * service-agnostic vectors AWS distributes at
 * https://docs.aws.amazon.com/general/latest/gr/signature-v4-test-suite.html) —
 * see `tests/lib/sigv4.test.ts`. Two S3-specific deviations from the generic
 * algorithm are called out below because they are the two most common ways a
 * hand-rolled SigV4 signer breaks against S3 specifically:
 *
 *   1. **Single URI-encoding, not double.** Every AWS service other than S3
 *      URI-encodes the canonical path TWICE (because the path in the request
 *      line is itself already encoded once). S3 is the documented exception:
 *      the canonical path is encoded exactly once. See "Elements of an AWS
 *      API request signature" (Amazon S3 API Reference) — "the URI-encoded
 *      version of the absolute path", encoded once for S3.
 *   2. **No path normalization.** S3 object keys may legitimately contain
 *      `..`, `.`, and repeated `/` as literal characters (S3 has no real
 *      directories), so the canonical URI must NOT collapse or resolve
 *      dot-segments the way a generic URL normalizer would. This signer
 *      builds the canonical path by decoding-then-re-encoding each `/`-
 *      separated segment of `new URL(url).pathname` independently, which
 *      avoids segment collapsing — but `URL` itself still resolves `.`/`..`
 *      segments before `.pathname` is read (WHATWG URL parsing), so a caller
 *      that needs a literal `..` or `.` path segment in an object key must
 *      route around this signer. Not exercised by this app's actions (none
 *      of them accept a key containing `.` or `..` as a full segment).
 */

/** The three fields the `sign` hook receives from an `aws-iam` Connection's credential. */
export interface AwsCredential {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface SignableRequestLike {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | null;
}

/** SigV4's fixed algorithm identifier — exported so `auth/aws-iam.ts` can build the final header value itself (see `computeSigV4`'s docstring for why that assembly doesn't happen here). */
export const ALGORITHM = "AWS4-HMAC-SHA256";
const TERMINATOR = "aws4_request";

// --- low-level crypto --------------------------------------------------

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(digest);
}

async function hmac(keyBytes: Uint8Array, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

async function hmacHex(keyBytes: Uint8Array, data: string): Promise<string> {
  return toHex((await hmac(keyBytes, data)).buffer as ArrayBuffer);
}

/**
 * Derive the scoped signing key: `HMAC(HMAC(HMAC(HMAC("AWS4"+secret, date),
 * region), service), "aws4_request")`. Per
 * https://docs.aws.amazon.com/general/latest/gr/sigv4-signed-request-examples.html#derive-signing-key-sigv4
 */
async function deriveSigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<Uint8Array> {
  const kDate = await hmac(new TextEncoder().encode("AWS4" + secretAccessKey), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, TERMINATOR);
}

// --- canonicalization ----------------------------------------------------

const UNRESERVED = /^[A-Za-z0-9\-_.~]$/;

/**
 * AWS's custom percent-encoding: encode every byte except the unreserved set
 * (`A-Z a-z 0-9 - _ . ~`), uppercase hex, UTF-8 byte-wise. `encodeSlash`
 * controls whether `/` itself is encoded — kept literal in a path, encoded
 * in a query string or header value used as a signed component.
 */
export function awsUriEncode(input: string, encodeSlash = true): string {
  let out = "";
  for (const ch of input) {
    if (UNRESERVED.test(ch)) {
      out += ch;
    } else if (ch === "/") {
      out += encodeSlash ? "%2F" : "/";
    } else {
      for (const byte of new TextEncoder().encode(ch)) {
        out += "%" + byte.toString(16).toUpperCase().padStart(2, "0");
      }
    }
  }
  return out;
}

/**
 * S3 canonical URI: decode each `/`-separated path segment and re-encode it
 * once with `awsUriEncode`, without collapsing empty segments (S3 has no
 * real directories, so `a//b` is a different key than `a/b`). Encoded
 * exactly once — see the module docstring's deviation (1).
 */
export function canonicalUriPath(pathname: string): string {
  if (pathname === "") return "/";
  const segments = pathname.split("/").map((seg) => {
    let decoded = seg;
    try {
      decoded = decodeURIComponent(seg);
    } catch {
      // Not valid percent-encoding — sign the segment as-is.
    }
    return awsUriEncode(decoded, false);
  });
  return segments.join("/");
}

/**
 * Canonical query string: URI-encode each key/value individually, then sort
 * the pairs by encoded key, then encoded value (byte/ASCII order). Repeated
 * keys are kept as separate pairs, sorted amongst themselves by value.
 */
export function canonicalQueryString(search: string): string {
  const qs = search.startsWith("?") ? search.slice(1) : search;
  if (!qs) return "";
  const pairs: [string, string][] = qs.split("&").filter(Boolean).map((pair) => {
    const eq = pair.indexOf("=");
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? "" : pair.slice(eq + 1);
    return [
      awsUriEncode(decodeURIComponent(rawKey.replace(/\+/g, " "))),
      awsUriEncode(decodeURIComponent(rawValue.replace(/\+/g, " "))),
    ];
  });
  pairs.sort(([ak, av], [bk, bv]) => (ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0));
  return pairs.map(([k, v]) => `${k}=${v}`).join("&");
}

/** Trim and collapse internal whitespace runs to a single space, per the header-value canonicalization rule. */
function canonicalizeHeaderValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export interface CanonicalHeaders {
  canonicalHeaders: string;
  signedHeaders: string;
}

/** Build the sorted `name:value\n` block and the `;`-joined signed-header list. */
export function canonicalizeHeaders(headers: Record<string, string>): CanonicalHeaders {
  const byName = new Map<string, string>();
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    const canonicalValue = canonicalizeHeaderValue(value);
    byName.set(
      lower,
      byName.has(lower) ? `${byName.get(lower)},${canonicalValue}` : canonicalValue,
    );
  }
  const names = [...byName.keys()].sort();
  const canonicalHeaders = names.map((n) => `${n}:${byName.get(n)}\n`).join("");
  return { canonicalHeaders, signedHeaders: names.join(";") };
}

/** `YYYYMMDDTHHMMSSZ`, the ISO 8601 basic format SigV4 requires for `x-amz-date`. */
export function amzDateStamp(now: Date): { amzDate: string; dateStamp: string } {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

// --- canonical request / string to sign -----------------------------------

export interface CanonicalRequestParts {
  method: string;
  canonicalUri: string;
  canonicalQuery: string;
  canonicalHeaders: string;
  signedHeaders: string;
  payloadHashHex: string;
}

export function buildCanonicalRequest(parts: CanonicalRequestParts): string {
  return [
    parts.method.toUpperCase(),
    parts.canonicalUri,
    parts.canonicalQuery,
    parts.canonicalHeaders,
    parts.signedHeaders,
    parts.payloadHashHex,
  ].join("\n");
}

export async function buildStringToSign(
  amzDate: string,
  credentialScope: string,
  canonicalRequest: string,
): Promise<string> {
  const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
  return [ALGORITHM, amzDate, credentialScope, hashedCanonicalRequest].join("\n");
}

/** SHA-256 hex digest of the empty string — the payload hash for a bodyless request. */
export const EMPTY_BODY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/** The literal S3 uses in place of a real payload hash for unsigned/streamed bodies. */
export const UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";

/**
 * Compute a SigV4 signature for an outbound request against AWS `service` in
 * the credential's region. Pure computation: no network access, matching the
 * `sign` hook's network-less contract.
 *
 * Deliberately stops short of building the final `Authorization` header
 * value — it returns the raw signature and the headers that must accompany
 * it (`host`, `x-amz-date`, and for S3 `x-amz-content-sha256`) instead. The
 * pack's conformance auditor (`_tools/audit.ts`) statically flags any
 * `lib/`-file line that assigns an `authorization` header/property, on the
 * rule that only `auth/` may construct one — so `auth/aws-iam.ts`'s `sign`
 * hook does that one-line assembly itself, keeping this module's job purely
 * "compute the signature," not "know how the header is spelled."
 */
export interface SigV4Signature {
  /** Extra headers to merge onto the request before the caller adds its own Authorization header — `host`, `x-amz-date`, and (for S3) `x-amz-content-sha256`. */
  headers: Record<string, string>;
  credentialScope: string;
  signedHeaders: string;
  /** Hex-encoded HMAC-SHA256 signature — the `Signature=` component of the Authorization header value. */
  signature: string;
}

export async function computeSigV4(
  request: SignableRequestLike,
  credential: AwsCredential,
  service: string,
  now: Date = new Date(),
): Promise<SigV4Signature> {
  const url = new URL(request.url);
  const { amzDate, dateStamp } = amzDateStamp(now);

  const existingHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(request.headers ?? {})) existingHeaders[k.toLowerCase()] = v;

  const payloadHashHex = existingHeaders["x-amz-content-sha256"] ??
    (request.body ? await sha256Hex(request.body) : EMPTY_BODY_SHA256);

  // `x-amz-content-sha256` is an S3-specific MUST (see the module docstring's
  // link to AWS's canonical-request rules); for other services it is only
  // signed when the caller already set it. This is what lets this same
  // function reproduce AWS's generic (non-S3) published test vectors
  // byte-for-byte in `tests/lib/sigv4.test.ts`, while still always doing the
  // right thing for this app's actual `service: "s3"` traffic.
  const mustSignContentHash = service === "s3" || "x-amz-content-sha256" in existingHeaders;
  const headers: Record<string, string> = {
    ...existingHeaders,
    host: url.host,
    "x-amz-date": amzDate,
    ...(mustSignContentHash ? { "x-amz-content-sha256": payloadHashHex } : {}),
  };

  const { canonicalHeaders, signedHeaders } = canonicalizeHeaders(headers);
  const canonicalRequest = buildCanonicalRequest({
    method: request.method,
    canonicalUri: canonicalUriPath(url.pathname),
    canonicalQuery: canonicalQueryString(url.search),
    canonicalHeaders,
    signedHeaders,
    payloadHashHex,
  });

  const credentialScope = `${dateStamp}/${credential.region}/${service}/${TERMINATOR}`;
  const stringToSign = await buildStringToSign(amzDate, credentialScope, canonicalRequest);
  const signingKey = await deriveSigningKey(
    credential.secretAccessKey,
    dateStamp,
    credential.region,
    service,
  );
  const signature = await hmacHex(signingKey, stringToSign);

  return { headers, credentialScope, signedHeaders, signature };
}
