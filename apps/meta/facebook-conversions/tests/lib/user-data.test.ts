/**
 * The hashing/validation path is the part of this app that can fail silently in
 * production, so it gets the closest tests. Every expected digest below was
 * produced independently with `sha256sum`, not with this module's own
 * `sha256Hex` — a test that hashes with the code under test proves only that
 * the code is self-consistent.
 */
import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  HASHED_KEYS,
  prepareEvent,
  prepareUserData,
  RAW_KEYS,
  SHA256_HEX,
  sha256Hex,
  UserDataError,
} from "../../lib/user-data.ts";

/** printf '%s' "<value>" | sha256sum */
const H = {
  email: "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b", // test@example.com
  phone: "6069d14bf122fdfd931dc7beb58e5dfbba395b1faf05bdcd42d12358d63d8599", // 16505551234
  john: "96d9632f363564cc3032521409cf22a852f2032eec099ed5967c0d000cec607a", // john
  doe: "799ef92a11af918e3fb741df42934f3b568ed2d93ac1df74f1b8d41a27932a6f", // doe
  dob: "5e0c46f17ed189d65863756df0241071eb2b1e24e8ec842d3e0618b2ff8eb8b7", // 19850412
  female: "252f10c83610ebca1a059c0bae8255eba2f95be4d1d7bcfa89d7248a82d9f111", // f
  city: "350c754ba4d38897693aa077ef43072a859d23f613443133fecbbd90a3512ca5", // newyork
  state: "6959097001d10501ac7d54c0bdb8db61420f658f2922cc26e46d536119a31126", // ca
  zip: "b9a9cf3cd3723a2e91b7c23ecf68456e872b6e5d86e5cab7f3d45a7302da32c7", // 94025
  country: "79adb2a2fce5c6ba215fe5f27f532d4e7edbac4b6a5e09e1ef3a08084a904621", // us
  obrien: "65b87174be3b1b122e2b0929f0b84888637d31a4a83bb96a860bcff411f5e668", // o'brien
};

Deno.test("sha256Hex: matches an independently computed digest", async () => {
  assertEquals(await sha256Hex("test@example.com"), H.email);
});

// ------------------------------------------------------------ normalisation --

Deno.test("normalisation: email is trimmed and lowercased before hashing", async () => {
  const out = await prepareUserData({ em: "  TEST@Example.COM  " });
  assertEquals(out.em, H.email);
});

Deno.test("normalisation: phone strips symbols and a leading + or 00", async () => {
  for (const raw of ["+1 (650) 555-1234", "001-650-555-1234", "1-650-555-1234"]) {
    const out = await prepareUserData({ ph: raw });
    assertEquals(out.ph, H.phone, `failed for ${raw}`);
  }
});

Deno.test("normalisation: a national-format phone (trunk zero) is rejected", async () => {
  // "020 7946 0958" → strip symbols → "02079460958" → the leading 00-strip rule
  // removes at most two zeros, leaving "79460958"... so use a number that still
  // starts with 0 after the rule: three leading zeros.
  await assertRejects(
    () => prepareUserData({ ph: "0000 7946 0958" }),
    UserDataError,
    "trunk zero",
  );
});

Deno.test("normalisation: a phone too short to be international is rejected", async () => {
  await assertRejects(() => prepareUserData({ ph: "12345" }), UserDataError, "ph");
});

Deno.test("normalisation: names are lowercased and trimmed, punctuation kept (Meta SDK rule)", async () => {
  const out = await prepareUserData({ fn: " John ", ln: "Doe" });
  assertEquals(out.fn, H.john);
  assertEquals(out.ln, H.doe);
  // The doc page says "no punctuation"; the Business SDK does not strip it, and
  // hash equality with the SDK is what matters. Pinned so a change is deliberate.
  const punctuated = await prepareUserData({ ln: "O'Brien" });
  assertEquals(punctuated.ln, H.obrien);
});

Deno.test("normalisation: date of birth accepts punctuation and emits YYYYMMDD", async () => {
  for (const raw of ["19850412", "1985-04-12", "1985/04/12"]) {
    const out = await prepareUserData({ db: raw });
    assertEquals(out.db, H.dob, `failed for ${raw}`);
  }
});

Deno.test("normalisation: an implausible date of birth is rejected", async () => {
  await assertRejects(() => prepareUserData({ db: "1985-13-40" }), UserDataError, "db");
  await assertRejects(() => prepareUserData({ db: "12 April 1985" }), UserDataError, "db");
});

Deno.test("normalisation: gender collapses to the f/m initial", async () => {
  assertEquals((await prepareUserData({ ge: "Female" })).ge, H.female);
  assertEquals((await prepareUserData({ ge: "F" })).ge, H.female);
  await assertRejects(() => prepareUserData({ ge: "nonbinary" }), UserDataError, '"f" or "m"');
});

Deno.test("normalisation: city and state drop digits, spaces, periods, dashes and parens", async () => {
  assertEquals((await prepareUserData({ ct: "New York" })).ct, H.city);
  assertEquals((await prepareUserData({ st: "C.A." })).st, H.state);
});

Deno.test("normalisation: zip drops whitespace and the ZIP+4 suffix", async () => {
  assertEquals((await prepareUserData({ zp: "94025-1234" })).zp, H.zip);
  assertEquals((await prepareUserData({ zp: " 94025 " })).zp, H.zip);
});

Deno.test("normalisation: country must be a two-letter code", async () => {
  assertEquals((await prepareUserData({ country: "US" })).country, H.country);
  await assertRejects(
    () => prepareUserData({ country: "United States" }),
    UserDataError,
    "ISO 3166-1",
  );
});

Deno.test("normalisation: an already-hashed value passes through untouched", async () => {
  const out = await prepareUserData({ em: H.email.toUpperCase() });
  assertEquals(out.em, H.email);
});

Deno.test("normalisation: identity fields accept and dedupe arrays", async () => {
  const out = await prepareUserData({ em: ["TEST@example.com", "test@example.com "] });
  assertEquals(out.em, [H.email]);
});

// ------------------------------------------------------- raw PII is refused --

Deno.test("every required-hashed field emits a SHA-256 digest, never a raw value", async () => {
  const out = await prepareUserData({
    em: "test@example.com",
    ph: "+1 650 555 1234",
    fn: "John",
    ln: "Doe",
    db: "1985-04-12",
    ge: "female",
    ct: "New York",
    st: "CA",
    zp: "94025-1234",
    country: "US",
  });
  for (const key of HASHED_KEYS) {
    assert(typeof out[key] === "string", `${key} is missing`);
    assert(SHA256_HEX.test(out[key] as string), `${key} was not a SHA-256 digest: it leaked raw`);
  }
  // The raw values must appear nowhere in the serialised payload.
  const wire = JSON.stringify(out);
  for (const raw of ["test@example.com", "John", "Doe", "New York", "@"]) {
    assertEquals(wire.includes(raw), false, `raw value ${raw} reached the wire`);
  }
});

Deno.test("pre-hashed mode: a raw email is rejected loudly and named as such", async () => {
  const err = await assertRejects(
    () => prepareUserData({ em: "test@example.com" }, "pre-hashed"),
    UserDataError,
  );
  assertStringIncludes(err.message, "raw email address");
  assertStringIncludes(err.message, "user_data.em");
  // The message must not repeat the PII it is complaining about.
  assertEquals(err.message.includes("test@example.com"), false);
});

Deno.test("pre-hashed mode: any non-digest value is rejected, not forwarded", async () => {
  for (const key of HASHED_KEYS) {
    await assertRejects(
      () => prepareUserData({ [key]: "definitely-not-a-digest" }, "pre-hashed"),
      UserDataError,
      key,
    );
  }
});

Deno.test("pre-hashed mode: an existing digest is accepted", async () => {
  const out = await prepareUserData({ em: H.email, ph: H.phone }, "pre-hashed");
  assertEquals(out, { em: H.email, ph: H.phone });
});

Deno.test("an MD5 digest is rejected rather than re-hashed", async () => {
  const md5 = "d41d8cd98f00b204e9800998ecf8427e";
  for (const mode of ["auto", "pre-hashed"] as const) {
    const err = await assertRejects(
      () => prepareUserData({ em: md5 }, mode),
      UserDataError,
    );
    assertStringIncludes(err.message, "MD5");
  }
});

Deno.test("hashing a field Meta needs in the clear is rejected", async () => {
  const err = await assertRejects(
    () => prepareUserData({ client_ip_address: H.email }),
    UserDataError,
  );
  assertStringIncludes(err.message, "unhashed");
});

// ------------------------------------------------------------- pass-through --

Deno.test("do-not-hash fields are forwarded verbatim", async () => {
  const raw: Record<string, unknown> = {
    client_ip_address: "203.0.113.7",
    client_user_agent: "Mozilla/5.0",
    fbc: "fb.1.1554763741205.AbCdEfGh",
    fbp: "fb.1.1558571054389.1098115397",
    lead_id: 123456,
  };
  const out = await prepareUserData(raw);
  for (const key of Object.keys(raw)) assertEquals(out[key], raw[key]);
  // RAW_KEYS is the list this behaviour is driven from; keep them in sync.
  for (const key of Object.keys(raw)) assert((RAW_KEYS as readonly string[]).includes(key));
});

Deno.test("external_id is forwarded verbatim — the Business SDK does not hash it", async () => {
  const out = await prepareUserData({ external_id: "customer-42" }, "auto");
  assertEquals(out.external_id, "customer-42");
  // …and pre-hashed mode does not demand a digest for it either, because Meta
  // only *recommends* hashing here.
  const strict = await prepareUserData({ external_id: "customer-42" }, "pre-hashed");
  assertEquals(strict.external_id, "customer-42");
});

Deno.test("unknown user_data keys are passed through rather than dropped", async () => {
  const out = await prepareUserData({ em: H.email, ig_sid: "17841400000000000" });
  assertEquals(out.ig_sid, "17841400000000000");
});

Deno.test("an empty user_data object is rejected", async () => {
  await assertRejects(() => prepareUserData({}), Error, "at least one identifier");
  await assertRejects(() => prepareUserData({ em: "" }), Error, "at least one identifier");
});

Deno.test("user_data must be an object", async () => {
  await assertRejects(() => prepareUserData("nope"), Error, "must be an object");
  await assertRejects(() => prepareUserData([]), Error, "must be an object");
});

// -------------------------------------------------------------- prepareEvent --

Deno.test("prepareEvent: hashes user_data and leaves every other member alone", async () => {
  const event = await prepareEvent({
    event_name: "Purchase",
    event_time: 1762902353,
    action_source: "website",
    user_data: { em: "test@example.com" },
    custom_data: { currency: "usd", value: 123.45 },
  });
  assertEquals(event.user_data.em, H.email);
  assertEquals(event.event_name, "Purchase");
  assertEquals(event.custom_data, { currency: "usd", value: 123.45 });
});

Deno.test("prepareEvent: does not mutate its input", async () => {
  const input = { event_name: "Lead", user_data: { em: "test@example.com" } };
  await prepareEvent(input);
  assertEquals(input.user_data.em, "test@example.com");
});

Deno.test("prepareEvent: an event without user_data is rejected", async () => {
  await assertRejects(() => prepareEvent({ event_name: "Lead" }, "auto", 3), Error, "data[3]");
});

Deno.test("prepareEvent: a bad value names the offending index", async () => {
  const err = await assertRejects(
    () => prepareEvent({ event_name: "Lead", user_data: { em: "nope" } }, "auto", 7),
    Error,
  );
  assertStringIncludes(err.message, "data[7]");
  assertStringIncludes(err.message, "user_data.em");
});
