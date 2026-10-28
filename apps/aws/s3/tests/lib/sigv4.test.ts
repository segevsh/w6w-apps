/**
 * Verifies `lib/sigv4.ts` against AWS's own published Signature Version 4
 * test suite: https://docs.aws.amazon.com/general/latest/gr/signature-v4-test-suite.html
 *
 * These vectors use AWS's documented generic test credentials/scope
 * (`accessKeyId: AKIDEXAMPLE`, `secretAccessKey:
 * wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY`, `region: us-east-1`,
 * `service: "service"`, date `2015-08-30T12:36:00Z`) rather than an
 * S3-specific example, because AWS's S3 API Reference worked examples
 * ("GET Object", `sig-v4-header-based-auth.html`) render as a JS
 * single-page app with no static HTML to fetch verbatim — this file's
 * generic vectors were pulled instead from the same test-suite ZIP AWS
 * publishes at the URL above (mirrored, unmodified, at
 * https://github.com/saibotsivad/aws-sig-v4-test-suite, fetched 2026-07-31).
 * The signing ALGORITHM is identical for every AWS service, including S3 —
 * only the `service` string in the credential scope changes — so these
 * vectors validate this signer's canonical-request, string-to-sign, key
 * derivation and Authorization-header logic exactly as they will run for
 * `service: "s3"`.
 *
 * `get-vanilla` / `get-vanilla-query-order-key` / `get-unreserved` exercise
 * S3-specific canonicalization rules this signer implements deliberately
 * (single, not double, URI-encoding — see `lib/sigv4.ts`'s module docstring)
 * plus the generic ones (query-pair sorting by encoded key then value,
 * duplicate-key sorting, unreserved-character passthrough).
 * `post-x-www-form-urlencoded-parameters` exercises the request-body hash
 * and multi-header signing (content-length + content-type + host + date).
 */
import { assertEquals } from "@std/assert";
import {
  ALGORITHM,
  amzDateStamp,
  awsUriEncode,
  buildCanonicalRequest,
  buildStringToSign,
  canonicalizeHeaders,
  canonicalQueryString,
  canonicalUriPath,
  computeSigV4,
  type SignableRequestLike,
} from "../../lib/sigv4.ts";

const CONFIG = {
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
};
const SERVICE = "service";
const NOW = new Date("2015-08-30T12:36:00Z");

/**
 * `lib/sigv4.ts` deliberately stops short of building the `Authorization`
 * header value itself (that one-line assembly lives in `auth/aws-iam.ts` —
 * see `computeSigV4`'s docstring). This test-only helper reassembles it the
 * same way `sign()` does, so these vectors still verify the full header
 * byte-for-byte against AWS's published values.
 */
async function signAndBuildAuthHeader(
  request: SignableRequestLike,
  service: string,
): Promise<string> {
  const { credentialScope, signedHeaders, signature } = await computeSigV4(
    request,
    CONFIG,
    service,
    NOW,
  );
  const authorization = `${ALGORITHM} Credential=${CONFIG.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return authorization;
}

Deno.test("sigv4: amzDateStamp matches the test suite's fixed date", () => {
  assertEquals(amzDateStamp(NOW), { amzDate: "20150830T123600Z", dateStamp: "20150830" });
});

Deno.test("sigv4: get-vanilla — full Authorization header matches AWS's vector", async () => {
  const authorization = await signAndBuildAuthHeader(
    { url: "https://example.amazonaws.com/", method: "GET", headers: {} },
    SERVICE,
  );
  assertEquals(
    authorization,
    "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, " +
      "SignedHeaders=host;x-amz-date, " +
      "Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
  );
});

Deno.test("sigv4: get-vanilla — canonical request and string-to-sign match AWS's vector", async () => {
  const canonicalRequest = buildCanonicalRequest({
    method: "GET",
    canonicalUri: canonicalUriPath("/"),
    canonicalQuery: canonicalQueryString(""),
    canonicalHeaders: "host:example.amazonaws.com\nx-amz-date:20150830T123600Z\n",
    signedHeaders: "host;x-amz-date",
    payloadHashHex: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  });
  assertEquals(
    canonicalRequest,
    "GET\n/\n\nhost:example.amazonaws.com\nx-amz-date:20150830T123600Z\n\n" +
      "host;x-amz-date\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );

  const stringToSign = await buildStringToSign(
    "20150830T123600Z",
    "20150830/us-east-1/service/aws4_request",
    canonicalRequest,
  );
  assertEquals(
    stringToSign,
    "AWS4-HMAC-SHA256\n20150830T123600Z\n20150830/us-east-1/service/aws4_request\n" +
      "bb579772317eb040ac9ed261061d46c1f17a8133879d6129b6e1c25292927e63",
  );
});

Deno.test("sigv4: post-vanilla — POST with no body signs like AWS's vector", async () => {
  const authorization = await signAndBuildAuthHeader(
    { url: "https://example.amazonaws.com/", method: "POST", headers: {} },
    SERVICE,
  );
  assertEquals(
    authorization,
    "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, " +
      "SignedHeaders=host;x-amz-date, " +
      "Signature=5da7c1a2acd57cee7505fc6676e4e544621c30862966e37dddb68e92efbe5d6b",
  );
});

Deno.test("sigv4: get-vanilla-query-order-key — duplicate query keys sort by value", () => {
  // Param1=value2&Param1=Value1 -> Param1=Value1&Param1=value2 (ASCII 'V' < 'v').
  assertEquals(canonicalQueryString("Param1=value2&Param1=Value1"), "Param1=Value1&Param1=value2");
});

Deno.test("sigv4: get-vanilla-query-order-key — full signature matches AWS's vector", async () => {
  const authorization = await signAndBuildAuthHeader(
    {
      url: "https://example.amazonaws.com/?Param1=value2&Param1=Value1",
      method: "GET",
      headers: {},
    },
    SERVICE,
  );
  assertEquals(
    authorization,
    "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, " +
      "SignedHeaders=host;x-amz-date, " +
      "Signature=eedbc4e291e521cf13422ffca22be7d2eb8146eecf653089df300a15b2382bd1",
  );
});

Deno.test("sigv4: get-unreserved — unreserved characters pass through unencoded", () => {
  const path = "/-._~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  assertEquals(canonicalUriPath(path), path);
});

Deno.test("sigv4: get-unreserved — full signature matches AWS's vector", async () => {
  const authorization = await signAndBuildAuthHeader(
    {
      url:
        "https://example.amazonaws.com/-._~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      method: "GET",
      headers: {},
    },
    SERVICE,
  );
  assertEquals(
    authorization,
    "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, " +
      "SignedHeaders=host;x-amz-date, " +
      "Signature=07ef7494c76fa4850883e2b006601f940f8a34d404d0cfa977f52a65bbf5f24f",
  );
});

Deno.test("sigv4: post-x-www-form-urlencoded-parameters — canonical request matches AWS's vector", () => {
  // Content-Length is part of the *original* raw request being replayed, so
  // it's passed explicitly (a real HTTP client sets it itself; this signer
  // only signs the headers a caller actually hands it).
  const canonicalRequest = buildCanonicalRequest({
    method: "POST",
    canonicalUri: canonicalUriPath("/"),
    canonicalQuery: canonicalQueryString(""),
    canonicalHeaders: canonicalizeHeaders({
      "content-type": "application/x-www-form-urlencoded; charset=utf-8",
      "content-length": "13",
      host: "example.amazonaws.com",
      "x-amz-date": "20150830T123600Z",
    }).canonicalHeaders,
    signedHeaders: "content-length;content-type;host;x-amz-date",
    payloadHashHex: "9095672bbd1f56dfc5b65f3e153adc8731a4a654192329106275f4c7b24d0b6e",
  });
  assertEquals(
    canonicalRequest,
    "POST\n/\n\ncontent-length:13\n" +
      "content-type:application/x-www-form-urlencoded; charset=utf-8\n" +
      "host:example.amazonaws.com\nx-amz-date:20150830T123600Z\n\n" +
      "content-length;content-type;host;x-amz-date\n" +
      "9095672bbd1f56dfc5b65f3e153adc8731a4a654192329106275f4c7b24d0b6e",
  );
});

Deno.test("sigv4: post-x-www-form-urlencoded-parameters — full signature (independently cross-checked)", async () => {
  // NOTE: this fixture's own mirrored `.sts`/`.authz` files are internally
  // inconsistent with their own `.creq` (SHA-256 of the mirror's `.creq` text
  // does not equal the hash embedded in its `.sts` — a bug in the mirror
  // repo, not in AWS's original suite), so this assertion is cross-checked
  // against an independent second implementation of the same algorithm
  // (Python, `hashlib`/`hmac`, written from AWS's spec directly) rather than
  // against that specific published value. The canonical-request text above
  // — the part actually sourced from AWS — DOES match exactly; only the
  // downstream signature in the mirror is suspect. The other four vectors in
  // this file (`get-vanilla`, `post-vanilla`, `get-vanilla-query-order-key`,
  // `get-unreserved`) match AWS's published `.authz` byte-for-byte with no
  // such discrepancy.
  const authorization = await signAndBuildAuthHeader(
    {
      url: "https://example.amazonaws.com/",
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=utf-8",
        "content-length": "13",
      },
      body: "Param1=value1",
    },
    SERVICE,
  );
  assertEquals(
    authorization,
    "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, " +
      "SignedHeaders=content-length;content-type;host;x-amz-date, " +
      "Signature=2b9566917226a17022b710430a367d343cbff33af7ee50b0ff8f44d75a4a46d8",
  );
});

Deno.test("sigv4: awsUriEncode encodes space, plus and slash per AWS's rule", () => {
  assertEquals(awsUriEncode("a b"), "a%20b");
  assertEquals(awsUriEncode("a+b"), "a%2Bb");
  assertEquals(awsUriEncode("a/b", true), "a%2Fb");
  assertEquals(awsUriEncode("a/b", false), "a/b");
});

Deno.test("sigv4: canonicalizeHeaders lowercases, sorts, trims and joins duplicates", () => {
  const { canonicalHeaders, signedHeaders } = canonicalizeHeaders({
    "X-Amz-Date": "20150830T123600Z",
    "Host": "example.amazonaws.com",
    "My-Header1": "  value1  ",
  });
  assertEquals(signedHeaders, "host;my-header1;x-amz-date");
  assertEquals(
    canonicalHeaders,
    "host:example.amazonaws.com\nmy-header1:value1\nx-amz-date:20150830T123600Z\n",
  );
});

Deno.test("sigv4: computeSigV4 sets x-amz-content-sha256 to the real body hash", async () => {
  const { headers } = await computeSigV4(
    { url: "https://example.amazonaws.com/", method: "PUT", headers: {}, body: "hello" },
    CONFIG,
    "s3",
    NOW,
  );
  assertEquals(
    headers["x-amz-content-sha256"],
    "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
  );
});
