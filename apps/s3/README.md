# Amazon S3

Store and retrieve objects in Amazon S3, signed with AWS Signature Version 4 (SigV4).

- **Categories** — storage
- **Auth methods** — aws-iam
- **Actions** — 9
- **Egress allowlist** — 36 path-style regional S3 endpoints (`s3.<region>.amazonaws.com`), one per AWS commercial region + AWS GovCloud (US)

## Auth — AWS IAM Access Key

`type: "custom"`. None of the built-in auth types (`apiKey`, `bearer`, `basic`, `oauth2`) fit SigV4:
it isn't a single static header value, it's a per-request signature computed over the method, path,
query, headers and body hash. `custom` is the documented escape hatch for exactly this shape.

| Field | Type | Required | Notes |
|---|---|---|---|
| `accessKeyId` | string | ✅ | IAM access key ID |
| `secretAccessKey` | secret | ✅ | IAM secret access key |
| `region` | string | ✅ | e.g. `us-east-1`. Selects the S3 endpoint every action calls. |

- **`sign`** computes the full SigV4 signature (see below) and sets `Authorization`,
  `x-amz-date`, and `x-amz-content-sha256`. It is pure local computation — canonical request
  construction + HMAC-SHA256 — so it fits the network-less `sign` sandbox exactly.
- **`test`** calls `ListBuckets` (`GET /` with no bucket in the path) — AWS's own documented way to
  validate a key, needing only the near-universal `s3:ListAllMyBuckets` permission, at the cost of
  one request with no bucket name and no body.
- **`afterConnect`** echoes the (non-secret) `region` onto the Connection's `display`, so actions can
  read `ctx.connection.display.region` to pick the right host without ever seeing the credential —
  the same pattern this pack already uses for Mailgun's US/EU split and Twilio's account SID
  (`lib/connection.ts`).

## SigV4 signing — how it was verified

`lib/sigv4.ts` implements the algorithm exactly as AWS publishes it
([Elements of an AWS API request signature](https://docs.aws.amazon.com/general/latest/gr/sigv4-signed-request-examples.html),
[Signature Version 4 overview](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html)):
build a canonical request, hash it, build a string to sign, derive a scoped signing key via a
chained `HMAC-SHA256("AWS4"+secret, date) -> region -> service -> "aws4_request"`, then HMAC the
string to sign with that key. All hashing/HMAC uses Deno's built-in `crypto.subtle` — no crypto
dependency.

**Verification.** AWS's worked "GET Object" example on `docs.aws.amazon.com/AmazonS3/...` renders as
a client-side single-page app with no static HTML to fetch or quote verbatim, so this signer is
instead verified against AWS's own **published SigV4 conformance test suite**
(`docs.aws.amazon.com/general/latest/gr/signature-v4-test-suite.html`, mirrored unmodified at
[saibotsivad/aws-sig-v4-test-suite](https://github.com/saibotsivad/aws-sig-v4-test-suite), fetched
2026-07-31) — `tests/lib/sigv4.test.ts` asserts this signer's output matches AWS's published
`Authorization` header **byte-for-byte** for four vectors (`get-vanilla`, `post-vanilla`,
`get-vanilla-query-order-key`, `get-unreserved`), covering empty-body signing, query-parameter
sorting/encoding (including duplicate keys), and unreserved-character passthrough. A fifth vector
(`post-x-www-form-urlencoded-parameters`, covering a request body + multi-header signing) is
included too, but its specific mirrored `.sts`/`.authz` files are internally inconsistent (the
SHA-256 of the mirror's own `.creq` text does not equal the hash embedded in its `.sts` — a bug in
that mirror, not in AWS's suite) — the canonical-request text is still asserted against AWS's
published value (and matches exactly), while the final signature is cross-checked against an
independent second implementation of the same algorithm (Python, `hashlib`/`hmac`) rather than
against that one suspect value. See the comments in `tests/lib/sigv4.test.ts` for the full trail.

**Two S3-specific deviations from the generic (non-S3) algorithm**, both implemented and covered by
the test suite above:

1. **Single URI-encoding, not double.** Every other AWS service URI-encodes the canonical path
   *twice*; S3 is the documented exception and encodes it once.
2. **`x-amz-content-sha256` is always signed for S3**, even on a bodyless `GET` (the generic
   algorithm doesn't require it at all — `lib/sigv4.ts`'s `computeSigV4` only forces this header
   for `service: "s3"`, which is what lets the same function reproduce AWS's *generic* test vectors
   byte-for-byte while still doing the right thing for this app's real traffic).

**Not implemented: no `..`/`.` path-segment normalization guard.** S3 object keys may legitimately
contain `..`/`.` as literal characters (S3 has no real directories) and the canonical path must not
collapse them — but this signer derives the canonical path from `new URL(request.url).pathname`,
and the WHATWG `URL` parser itself resolves dot-segments before `.pathname` is ever read. None of
this app's actions build a key containing a `.`/`..` path segment, so it isn't exercised, but a key
that genuinely needs one would not sign correctly. Flagged rather than silently shipped.

## Egress allowlist — why 36 exact hostnames, not a wildcard

The spec's own suggested fallback forms — `["s3.amazonaws.com", "s3.*.amazonaws.com"]` — turned out
not to match the sandbox's real matching rule once checked against
[`hostAllowed()`](https://github.com/w6w-io/w6w-core/blob/main/packages/runtime/src/runtime.ts) and
its test suite (`packages/runtime/tests/allowlist.test.ts`): an allowlist entry is either an **exact**
hostname, or a **`"*.<domain>"` prefix** matching any subdomain at any depth of that suffix (never
the apex) — there is no support for a wildcard in the *middle* of a hostname. `s3.*.amazonaws.com`
is exactly that unsupported shape, so it would never match anything; `*.s3.amazonaws.com` only
matches the legacy global virtual-hosted endpoint (`bucket.s3.amazonaws.com`), not a regional
path-style host (`s3.us-east-1.amazonaws.com` has no leading subdomain at all — it's the apex of the
`s3.us-east-1.amazonaws.com` name, not a `*.s3.amazonaws.com` subdomain).

Since `region` is a per-Connection value the static manifest can't range over with a real wildcard,
this app enumerates every AWS S3 regional endpoint **by exact hostname**, sourced from AWS's own
["Amazon S3 endpoints and quotas"](https://docs.aws.amazon.com/general/latest/gr/s3.html) table
(fetched 2026-07-31; see `lib/regions.ts`, which is kept in lockstep with `package.json`'s
`w6w.network.allow` — both list the same 36 hosts in the same order). All requests use **path-style**
URLs (`https://s3.<region>.amazonaws.com/<bucket>/<key>`) rather than virtual-hosted style
(`<bucket>.s3.<region>.amazonaws.com`) specifically so the bucket name never needs to appear in the
hostname the allowlist has to match.

**Excluded on purpose:** the `aws-cn` partition (`s3.cn-north-1.amazonaws.com.cn` etc.) — a separate
partition with its own credentials and a `.com.cn` domain, out of scope for a single `region` field
— and S3's Access Point / Multi-Region Access Point / Outposts / Tables endpoint families, which are
different products with their own hostnames, not covered by any of the 9 actions here.

## Binary content — a real, load-bearing limitation

Every request an action makes travels through the shared sandbox's `ctx.fetch`, and the worker-side
fetch shim (`@w6w/runtime`'s `sandbox/worker.ts`) coerces **any** body to a string
(`String(init.body)`) before it ever reaches `sign` or the real network call — the `SignableRequest`
contract (`body?: string | null`) has no binary-body representation at all. This is a property of the
shared runtime, not something this app can route around.

Consequently:

- **Download (`object-get`, `encoding: "base64"`) is exact.** The *response* path preserves real
  bytes (`WireResponse.body: Uint8Array` -> `Response`), so base64-encoding a downloaded
  `ArrayBuffer` round-trips perfectly regardless of byte values.
- **Upload (`object-put`, `encoding: "base64"`) is only byte-exact for decoded content whose bytes
  are all `< 0x80`.** `atob()` produces a Latin-1 "binary string" (one JS char per byte); that string
  then passes through `TextEncoder`'s UTF-8 encoding twice — once when this app hashes it for the
  signature, once when the runtime's `fetch` actually sends it — consistently with each other (so the
  signature always matches what's sent), but **not** consistently with the original bytes: any byte
  `>= 0x80` becomes a 2-byte UTF-8 sequence on the wire, silently corrupting true binary payloads
  (most images, PDFs, archives). Plain text content (`encoding: "text"`) is unaffected — a JS string
  is always valid UTF-16, so both `TextEncoder` passes agree with the original text exactly.

## No presigned-URL action

The spec for this app suggested a presigned-URL action as "genuinely achievable network-less" since
presigning is pure SigV4 computation. It turns out not to be achievable **within this app's hook
contract**, not because the crypto is hard: a presigned URL is credential-derived material that must
be *returned to the caller* as action output, but `sign` (the only hook ever handed the credential)
only ever mutates a request that the **host** then uses to perform `ctx.fetch` — its result never
flows back to an action's `execute` return value. There is no channel in the current `HookContext` /
`SignHook` contract for "compute a signature, but don't send the request, and hand the signed
artifact back to me as data" — inventing one (e.g. having an action's `execute` fabricate its own
signature over data it can't authenticate) would violate the "actions never see credentials"
invariant this whole sandbox model rests on. So this is called out plainly rather than shipped as
unverified — or actively credential-violating — crypto.

## Actions

| Key | Type | Resource | Operation |
|---|---|---|---|
| `bucket-list` | search | bucket | `GET /` — ListBuckets |
| `bucket-create` | perform | bucket | `PUT /<bucket>` — CreateBucket |
| `bucket-delete` | perform | bucket | `DELETE /<bucket>` — DeleteBucket |
| `object-list` | search | object | `GET /<bucket>?list-type=2&...` — ListObjectsV2, paginated |
| `object-get` | read | object | `GET /<bucket>/<key>` — GetObject, text or base64 |
| `object-put` | perform | object | `PUT /<bucket>/<key>` — PutObject, text or base64 |
| `object-delete` | perform | object | `DELETE /<bucket>/<key>` — DeleteObject |
| `object-copy` | perform | object | `PUT /<destBucket>/<destKey>` + `x-amz-copy-source` — CopyObject |
| `object-head` | read | object | `HEAD /<bucket>/<key>` — HeadObject (metadata only) |

Responses are XML; `lib/xml.ts` extracts only the specific flat fields each action's `output`
declares (not a general-purpose XML parser — the app contract allows only `@w6w/types` as a runtime
dependency, so this avoids adding one).

## Health check

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `auth:aws-iam` | credential | connection | signed | fatal | — | derived from the `aws-iam` auth method's `test` hook |

No `quota` check: S3 has no per-key request-quota headers the way SendGrid or GitHub do (S3's
capacity limits are request-rate-based and reported via CloudWatch, not response headers on a
regular API call), so there is no cheap per-connection probe to declare one against.

### Is the vendor up? (`service`)

```
GET https://health.aws.amazon.com/public/currentevents
```

This is the endpoint `https://status.aws.amazon.com` itself redirects to (confirmed live,
2026-07-31: `301` -> `health.aws.amazon.com/health/status`, whose front-end fetches
`currentevents` from that origin) — the modern form of AWS's public Service Health Dashboard.
Unauthenticated, no AWS account or support plan required. This is deliberately **not** the
*AWS Health API* (`health.us-east-1.amazonaws.com`), which needs a Business/Enterprise support
plan and IAM credentials — the wrong choice for a `credential: "none"` check that must work before
anyone has connected.

The feed returns every AWS service+region combination with a currently open or very-recently-
resolved event, as a flat JSON array; this check filters to entries whose `service` id starts with
`s3-` (`s3-us-east-1`, `s3-eu-west-1`, …) and reports one `components` entry per affected region, so
a Connection scoped to one region isn't marked degraded by an incident in another. One documented
gotcha: the response's `Content-Type` is `application/json;charset=utf-16` and the body **is**
UTF-16 (confirmed: big-endian, with a `FE FF` BOM) — `Response.text()`/`.json()` always decode as
UTF-8 regardless of the header, so the check reads `arrayBuffer()` and decodes explicitly, sniffing
the BOM itself (`TextDecoder("utf-16")` does **not** auto-detect endianness from a BOM — verified: it
always decodes little-endian, mangling this feed's big-endian bytes, unless `"utf-16be"` is named
explicitly).

### Is this credential live? (`auth:aws-iam`)

Derived automatically from the `aws-iam` auth method's `test` hook (`GET /` — ListBuckets). Nothing
extra to declare.

---

Researched and endpoint-verified 2026-07-31.
