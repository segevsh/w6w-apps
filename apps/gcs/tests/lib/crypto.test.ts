import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  encodeBase64Url,
  encodeHex,
  importPrivateKey,
  sha256Hex,
  signRs256,
} from "../../lib/crypto.ts";
import { TEST_PRIVATE_KEY } from "./_vector.ts";

/** The JWT assertion is three base64url segments, unpadded. */
Deno.test("encodeBase64Url: url-safe alphabet, no padding", () => {
  assertEquals(encodeBase64Url(new TextEncoder().encode("A")), "QQ");
  assertEquals(encodeBase64Url(new Uint8Array([251, 255, 254])), "-__-");
  assertEquals(encodeBase64Url(new Uint8Array([])), "");
});

Deno.test("encodeHex: lowercase, zero-padded", () => {
  assertEquals(encodeHex(new Uint8Array([0, 1, 15, 16, 222, 173])), "00010f10dead");
});

/** V4 canonicalisation hashes with this at two separate points. */
Deno.test("sha256Hex: matches the known digest of the empty string", async () => {
  assertEquals(
    await sha256Hex(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
});

Deno.test("importPrivateKey: imports a PKCS#8 PEM", async () => {
  const key = await importPrivateKey(TEST_PRIVATE_KEY);
  assertEquals(key.type, "private");
  assertEquals(key.algorithm.name, "RSASSA-PKCS1-v1_5");
});

/** Google's JSON encodes the newlines as \n inside a string. */
Deno.test("importPrivateKey: accepts newlines that survived as literal backslash-n", async () => {
  const escaped = TEST_PRIVATE_KEY.replace(/\n/g, "\\n");
  const key = await importPrivateKey(escaped);
  assertEquals(key.type, "private");
});

Deno.test("importPrivateKey: an empty or malformed key says what to check", async () => {
  await assertRejects(
    () => importPrivateKey("-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----"),
    Error,
    "empty after stripping its PEM markers",
  );
  await assertRejects(
    () => importPrivateKey("-----BEGIN PRIVATE KEY-----\nnot base64!!\n-----END PRIVATE KEY-----"),
    Error,
    "not valid base64",
  );
});

/** A Google key is PKCS#8, and the error says so rather than guessing. */
Deno.test("importPrivateKey: a non-PKCS#8 body names the format expected", async () => {
  await assertRejects(
    () => importPrivateKey("-----BEGIN RSA PRIVATE KEY-----\nQUJD\n-----END RSA PRIVATE KEY-----"),
    Error,
    "PKCS#8",
  );
});

/** Signing twice with RS256 is deterministic, unlike PSS. */
Deno.test("signRs256: produces a stable 256-byte signature", async () => {
  const key = await importPrivateKey(TEST_PRIVATE_KEY);
  const first = await signRs256(key, "hello");
  const second = await signRs256(key, "hello");
  assertEquals(first.length, 256);
  assertEquals(encodeHex(first), encodeHex(second));
  const other = await signRs256(key, "hello.");
  assert(encodeHex(first) !== encodeHex(other), "a different input signs differently");
});
