import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { parseAdminApiKey, signAdminApiJwt } from "../../lib/jwt.ts";

const VALID_SECRET = "0123456789abcdef".repeat(4); // 64 hex chars
const VALID_KEY = `5f3a1b2c3d4e5f6a7b8c9d0e:${VALID_SECRET}`;

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

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

Deno.test("parseAdminApiKey: splits a valid `id:secret` key", () => {
  const { id, secret } = parseAdminApiKey(VALID_KEY);
  assertEquals(id, "5f3a1b2c3d4e5f6a7b8c9d0e");
  assertEquals(secret, VALID_SECRET);
});

Deno.test("parseAdminApiKey: trims surrounding whitespace", () => {
  const { id } = parseAdminApiKey(`  ${VALID_KEY}  `);
  assertEquals(id, "5f3a1b2c3d4e5f6a7b8c9d0e");
});

Deno.test("parseAdminApiKey: rejects a malformed key with a clear message", () => {
  assertThrows(() => parseAdminApiKey("not-a-key"), Error, "Admin API Key");
  assertThrows(() => parseAdminApiKey("abc:def"), Error, "Admin API Key");
});

Deno.test("signAdminApiJwt: header is HS256/JWT with the key id as `kid`", async () => {
  const now = 1_700_000_000;
  const jwt = await signAdminApiJwt(VALID_KEY, now);
  const parts = jwt.split(".");
  assertEquals(parts.length, 3);

  const header = base64UrlDecodeJson(parts[0]) as { alg: string; typ: string; kid: string };
  assertEquals(header, { alg: "HS256", typ: "JWT", kid: "5f3a1b2c3d4e5f6a7b8c9d0e" });
});

Deno.test("signAdminApiJwt: claim carries iat/exp within Ghost's 5-minute cap and aud=/admin/", async () => {
  const now = 1_700_000_000;
  const jwt = await signAdminApiJwt(VALID_KEY, now);
  const claim = base64UrlDecodeJson(jwt.split(".")[1]) as {
    iat: number;
    exp: number;
    aud: string;
  };
  assertEquals(claim.iat, now);
  assertEquals(claim.exp, now + 300);
  assertEquals(claim.aud, "/admin/");
});

Deno.test("signAdminApiJwt: signature verifies against the hex-decoded secret via HMAC-SHA256", async () => {
  const jwt = await signAdminApiJwt(VALID_KEY, 1_700_000_000);
  const [headerB64, claimB64, sigB64] = jwt.split(".");
  const signingInput = new TextEncoder().encode(`${headerB64}.${claimB64}`);
  const signature = base64UrlDecodeBytes(sigB64);

  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(VALID_SECRET) as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify("HMAC", key, signature.buffer as ArrayBuffer, signingInput);
  assert(ok, "JWT signature must verify against the key's secret half");
});

Deno.test("signAdminApiJwt: rejects a malformed key with a clear message", async () => {
  await assertRejects(() => signAdminApiJwt("bad-key"), Error, "Admin API Key");
});
