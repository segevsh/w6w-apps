import { assert, assertEquals, assertRejects } from "@std/assert";
import { generateTestKeyPair } from "../_helpers.ts";
import {
  normalizeAccountForJwt,
  normalizeUsernameForJwt,
  publicKeyFingerprint,
  signKeyPairJwt,
} from "../../lib/jwt.ts";

function base64UrlDecodeJson(segment: string): unknown {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return JSON.parse(atob(padded + pad));
}

function base64UrlDecodeBytes(segment: string): Uint8Array {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.test("normalizeAccountForJwt: uppercases and replaces periods with hyphens", () => {
  assertEquals(normalizeAccountForJwt("myorg-myaccount"), "MYORG-MYACCOUNT");
  assertEquals(normalizeAccountForJwt("xy12345.us-east-1.aws"), "XY12345-US-EAST-1-AWS");
  assertEquals(normalizeAccountForJwt("  acme  "), "ACME");
});

Deno.test("normalizeUsernameForJwt: uppercases only", () => {
  assertEquals(normalizeUsernameForJwt("svc_user"), "SVC_USER");
});

Deno.test("signKeyPairJwt: header is RS256/JWT and claim shape matches Snowflake's spec", async () => {
  const { privateKeyPem, privateKey } = await generateTestKeyPair();
  const now = 1_700_000_000;
  const jwt = await signKeyPairJwt(
    { account: "myorg-myaccount", username: "svc_user", privateKey: privateKeyPem },
    now,
  );

  const parts = jwt.split(".");
  assertEquals(parts.length, 3);

  const header = base64UrlDecodeJson(parts[0]) as { alg: string; typ: string };
  assertEquals(header, { alg: "RS256", typ: "JWT" });

  const expectedFingerprint = await publicKeyFingerprint(privateKey);
  const claim = base64UrlDecodeJson(parts[1]) as {
    iss: string;
    sub: string;
    iat: number;
    exp: number;
  };
  assertEquals(claim.sub, `MYORG-MYACCOUNT.SVC_USER`);
  assertEquals(claim.iss, `MYORG-MYACCOUNT.SVC_USER.${expectedFingerprint}`);
  assertEquals(claim.iat, now);
  assert(claim.exp > claim.iat);
  assert(claim.exp - claim.iat <= 3600, "must stay within Snowflake's 1h hard cap");
});

Deno.test("signKeyPairJwt: the signature verifies against the matching public key", async () => {
  const { privateKeyPem, publicKey } = await generateTestKeyPair();
  const jwt = await signKeyPairJwt({ account: "acme", username: "u", privateKey: privateKeyPem });
  const [headerB64, claimB64, sigB64] = jwt.split(".");
  const signingInput = new TextEncoder().encode(`${headerB64}.${claimB64}`);
  const signature = base64UrlDecodeBytes(sigB64);

  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signature.buffer as ArrayBuffer,
    signingInput,
  );
  assert(ok, "JWT signature must verify against the public key derived from the same private key");
});

Deno.test("signKeyPairJwt: accepts a `\\n`-escaped single-line PEM (as pasted into a form field)", async () => {
  const { privateKeyPem } = await generateTestKeyPair();
  const escaped = privateKeyPem.replace(/\n/g, "\\n");
  const jwt = await signKeyPairJwt({ account: "acme", username: "u", privateKey: escaped });
  assertEquals(jwt.split(".").length, 3);
});

Deno.test("signKeyPairJwt: rejects an encrypted PKCS8 key with a clear message", async () => {
  const encrypted =
    "-----BEGIN ENCRYPTED PRIVATE KEY-----\nAAAA\n-----END ENCRYPTED PRIVATE KEY-----\n";
  await assertRejects(
    () => signKeyPairJwt({ account: "acme", username: "u", privateKey: encrypted }),
    Error,
    "encrypted private keys are not supported",
  );
});

Deno.test("signKeyPairJwt: rejects a non-PKCS8 (e.g. PKCS1) PEM with a clear message", async () => {
  const pkcs1 = "-----BEGIN RSA PRIVATE KEY-----\nAAAA\n-----END RSA PRIVATE KEY-----\n";
  await assertRejects(
    () => signKeyPairJwt({ account: "acme", username: "u", privateKey: pkcs1 }),
    Error,
    "PKCS8",
  );
});
