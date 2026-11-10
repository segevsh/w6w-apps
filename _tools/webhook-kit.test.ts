import {
  assert,
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { createHmac } from "node:crypto";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../apps/_shared/webhook/mod.ts";

const KEY = "Jefe";
const DATA = "what do ya want for nothing?";
const SHA256_HEX =
  "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843";
const SHA1_HEX = "effcdf6ae5eb2fa2d27416d5f184df9c259a7c79";

Deno.test("hmac: RFC 4231 / RFC 2202 known answers (hex)", async () => {
  assertEquals(await hmac("SHA-256", KEY, DATA, "hex"), SHA256_HEX);
  assertEquals(await hmac("SHA-1", KEY, DATA, "hex"), SHA1_HEX);
});

Deno.test("hmac: base64 forms match node:crypto, independent of the kit", async () => {
  for (
    const [alg, node] of [["SHA-256", "sha256"], ["SHA-1", "sha1"]] as const
  ) {
    assertEquals(
      await hmac(alg, KEY, DATA, "base64"),
      createHmac(node, KEY).update(DATA).digest("base64"),
    );
    assertEquals(
      await hmac(alg, KEY, DATA, "hex"),
      createHmac(node, KEY).update(DATA).digest("hex"),
    );
  }
});

Deno.test("hmac: Uint8Array key and non-ASCII data agree with node:crypto", async () => {
  const key = new Uint8Array([1, 2, 3, 250, 255]);
  const data = '{"name":"héllo ✓"}';
  assertEquals(
    await hmac("SHA-256", key, data, "hex"),
    createHmac("sha256", key).update(data).digest("hex"),
  );
});

Deno.test("requireRawBody: returns the string, including an empty one", () => {
  assertEquals(requireRawBody({ rawBody: '{ "a" : 1 }' }), '{ "a" : 1 }');
  assertEquals(requireRawBody({ rawBody: "" }), "");
});

Deno.test("requireRawBody: fails closed on absent, null, object, number", () => {
  for (const raw of [{}, { rawBody: null }, { rawBody: {} }, { rawBody: 5 }]) {
    const err = assertThrows(() => requireRawBody(raw), Error, "raw body");
    assert(err.message.includes("refused"));
  }
});

Deno.test("timingSafeEqual: equal, first-byte diff, last-byte diff, prefix, empty", () => {
  assertEquals(timingSafeEqual("abcdef", "abcdef"), true);
  assertEquals(timingSafeEqual("", ""), true);
  assertEquals(timingSafeEqual("abcdef", "xbcdef"), false);
  assertEquals(timingSafeEqual("abcdef", "abcdex"), false);
  assertEquals(timingSafeEqual("abc", "abcdef"), false);
  assertEquals(timingSafeEqual("abcdef", "abc"), false);
  assertEquals(timingSafeEqual("", "a"), false);
  assertEquals(timingSafeEqual("abc", "abc\0"), false);
  assertEquals(timingSafeEqual("é", "é"), true);
});

Deno.test("timingSafeEqual: the comparison loop has no early return", async () => {
  const src = await Deno.readTextFile(
    new URL("../apps/_shared/webhook/mod.ts", import.meta.url),
  );
  const start = src.indexOf("export function timingSafeEqual");
  const body = src.slice(start, src.indexOf("\n}\n", start));
  const loop = body.slice(body.indexOf("for ("));
  assert(loop.length > 0 && body.includes("Math.max"));
  assertEquals(
    /\breturn\b/.test(loop.slice(0, loop.indexOf("\n  }") + 4)),
    false,
  );
});

Deno.test("withinTolerance: exactly 300 s either way is in, 301 s is out", () => {
  const now = 1_700_000_000_000;
  const t = now / 1000;
  assertEquals(withinTolerance(t - 300, now, 300), true);
  assertEquals(withinTolerance(t + 300, now, 300), true);
  assertEquals(withinTolerance(t - 301, now, 300), false);
  assertEquals(withinTolerance(t + 301, now, 300), false);
  assertEquals(withinTolerance(t - 300, now), true);
  assertEquals(withinTolerance(t - 301, now), false);
  assertEquals(withinTolerance(NaN, now), false);
});

Deno.test("randomSecret: 64 hex chars by default, differs per call, honours bytes", () => {
  const a = randomSecret();
  assert(/^[0-9a-f]{64}$/.test(a));
  assertNotEquals(a, randomSecret());
  assertEquals(randomSecret(16).length, 32);
});

Deno.test("header: case-insensitive lookup, undefined when absent", () => {
  const raw = { headers: { "x-signature": "v", "X-Other": "w" } };
  assertEquals(header(raw, "X-Signature"), "v");
  assertEquals(header(raw, "x-other"), "w");
  assertEquals(header(raw, "missing"), undefined);
});

Deno.test("timingSafeEqual: non-string input is never equal", () => {
  assertEquals(timingSafeEqual(undefined as never, undefined as never), false);
  assertEquals(timingSafeEqual(null as never, "null"), false);
  assertEquals(timingSafeEqual(123 as never, "123"), false);
  assertEquals(timingSafeEqual({} as never, "[object Object]"), false);
  assertEquals(timingSafeEqual("a", undefined as never), false);
  assertEquals(timingSafeEqual("", ""), true);
  assertEquals(timingSafeEqual("abc", "abc"), true);
  assertEquals(timingSafeEqual("abc", "abd"), false);
});

Deno.test("hmac: rejects bad keys and data with the kit's own message", async () => {
  const bad: unknown[] = [
    5,
    true,
    "",
    new Uint8Array(0),
    { length: 4 },
    undefined,
    null,
  ];
  for (const k of bad) {
    const e = await assertRejects(
      () => hmac("SHA-256", k as never, "x", "hex"),
      Error,
    );
    assert(
      e.message.includes("key") && e.message.startsWith("hmac refused"),
      e.message,
    );
  }
  for (const d of [5, undefined, null, { length: 1 }]) {
    const e = await assertRejects(
      () => hmac("SHA-256", "k", d as never, "hex"),
      Error,
    );
    assert(
      e.message.includes("data") && e.message.startsWith("hmac refused"),
      e.message,
    );
  }
  assertEquals(await hmac("SHA-256", KEY, DATA, "hex"), SHA256_HEX);
  assertEquals(
    await hmac(
      "SHA-256",
      new TextEncoder().encode(KEY),
      new TextEncoder().encode(DATA),
      "hex",
    ),
    SHA256_HEX,
  );
  assertEquals(typeof (await hmac("SHA-256", "k", "", "hex")), "string");
});

Deno.test("randomSecret: refuses weak or non-integer sizes", () => {
  for (const n of [0, 15, NaN, 16.5, -1, Infinity, "32" as never]) {
    assertThrows(() => randomSecret(n), Error, "at least 16");
  }
  assertEquals(randomSecret().length, 64);
});

Deno.test("requireSecret: throws on unset or empty, returns a real secret, never echoes", () => {
  for (const v of [undefined, null, "", 5, {}]) {
    const e = assertThrows(() => requireSecret(v), Error);
    assert(e.message.includes("secret"));
  }
  const e = assertThrows(() => requireSecret(12345), Error);
  assert(!e.message.includes("12345"));
  assertEquals(requireSecret("s3cret"), "s3cret");
});
