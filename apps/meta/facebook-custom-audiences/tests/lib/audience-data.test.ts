import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  AudienceDataError,
  normalizeValue,
  prepareUsers,
  SHA256_HEX,
  sha256Hex,
} from "../../lib/audience-data.ts";

// Meta's own worked examples, Customer File Custom Audiences guide, "Hashing".
const MARY = "f1904cf1a9d73a55fa5de0ac823c4403ded71afd4c3248d00bdcd0866552bb79";
const PHONE = "1ef970831d7963307784fa8688e8fce101a15685d62aa765fed23f3a2c576a4e";

Deno.test("sha256Hex: matches Meta's published vectors", async () => {
  assertEquals(await sha256Hex("mary@example.com"), MARY);
  assertEquals(await sha256Hex("15559876543"), PHONE);
});

Deno.test("prepareUsers: normalises an email and a phone to Meta's vectors", async () => {
  const out = await prepareUsers([{ email: "  Mary@Example.COM ", phone: "+1 (555) 987-6543" }]);
  assertEquals(out.schema, ["EMAIL", "PHONE"]);
  assertEquals(out.data, [[MARY, PHONE]]);
});

Deno.test("prepareUsers: strips leading zeroes from a phone", async () => {
  const out = await prepareUsers([{ phone: "0015559876543" }]);
  assertEquals(out.data, [[PHONE]]);
});

Deno.test("normalizeValue: per-key rules from the guide", () => {
  assertEquals(normalizeValue("GEN", "female"), "f");
  assertEquals(normalizeValue("DOBM", "4"), "04");
  assertEquals(normalizeValue("DOBD", "9"), "09");
  assertEquals(normalizeValue("DOBY", "1985", new Date("2026-10-05")), "1985");
  assertEquals(normalizeValue("LN", "o'brien"), "obrien");
  assertEquals(normalizeValue("FN", "mary-jane"), "maryjane");
  assertEquals(normalizeValue("FN", "zoë"), "zoë");
  assertEquals(normalizeValue("FI", "mary"), "m");
  assertEquals(normalizeValue("CT", "new york"), "newyork");
  assertEquals(normalizeValue("ST", "ca"), "ca");
  assertEquals(normalizeValue("ZIP", "94035-1234"), "94035");
  assertEquals(normalizeValue("ZIP", "sw1a 1aa"), "sw1a1aa");
  assertEquals(normalizeValue("COUNTRY", "us"), "us");
});

Deno.test("normalizeValue: rejects out-of-range values", () => {
  assertEquals(
    [
      () => normalizeValue("DOBY", "1850"),
      () => normalizeValue("DOBM", "13"),
      () => normalizeValue("DOBD", "32"),
      () => normalizeValue("GEN", "x"),
      () => normalizeValue("COUNTRY", "usa"),
      () => normalizeValue("EMAIL", "nope"),
    ].map((f) => {
      try {
        f();
        return "no-throw";
      } catch (e) {
        return e instanceof AudienceDataError ? "rejected" : "other";
      }
    }),
    Array(6).fill("rejected"),
  );
});

Deno.test("prepareUsers: MADID is lowercased not hashed, EXTERN_ID is untouched", async () => {
  const out = await prepareUsers([{ madid: "AAAA-BBBB", externalId: "Cust-42" }]);
  assertEquals(out.schema, ["MADID", "EXTERN_ID"]);
  assertEquals(out.data, [["aaaa-bbbb", "Cust-42"]]);
});

Deno.test("prepareUsers: schema is the union of columns, gaps are empty strings", async () => {
  const out = await prepareUsers([
    { email: "mary@example.com" },
    { email: "bob@example.com", firstName: "Bob" },
  ]);
  assertEquals(out.schema, ["EMAIL", "FN"]);
  assertEquals(out.data[0][1], "");
  assertEquals(out.data[1][1], await sha256Hex("bob"));
});

Deno.test("prepareUsers: every hashed cell is a 64-hex digest (nothing raw leaves)", async () => {
  const out = await prepareUsers([{
    email: "a@b.co",
    phone: "5551234567",
    gender: "m",
    birthYear: 1990,
    birthMonth: 2,
    birthDay: 3,
    lastName: "Doe",
    firstName: "John",
    firstInitial: "J",
    city: "Austin",
    state: "TX",
    zip: "73301",
    country: "US",
  }]);
  assertEquals(out.schema.length, 13);
  for (const cell of out.data[0]) assert(SHA256_HEX.test(cell), cell);
});

Deno.test("prepareUsers: a value that is already a digest passes through", async () => {
  const out = await prepareUsers([{ email: MARY }], "pre-hashed");
  assertEquals(out.data, [[MARY]]);
});

Deno.test("prepareUsers: pre-hashed mode refuses a raw value without echoing it", async () => {
  const err = await assertRejects(
    () => prepareUsers([{ email: "secret.person@example.com" }], "pre-hashed"),
    AudienceDataError,
    "users[0].EMAIL",
  );
  assert(!err.message.includes("secret.person"));
});

Deno.test("prepareUsers: validation errors name row and field, never the value", async () => {
  const err = await assertRejects(
    () => prepareUsers([{ email: "fine@example.com" }, { email: "not-an-email-77" }]),
    AudienceDataError,
    "users[1].EMAIL",
  );
  assert(!err.message.includes("not-an-email-77"));
});

Deno.test("prepareUsers: unknown column, empty list and empty row are rejected", async () => {
  await assertRejects(() => prepareUsers([{ shoeSize: 9 }]), AudienceDataError, "unknown column");
  await assertRejects(() => prepareUsers([]), Error, "non-empty");
  await assertRejects(() => prepareUsers("x"), Error, "non-empty");
  await assertRejects(() => prepareUsers([{ email: "a@b.co" }, {}]), AudienceDataError, "users[1]");
});
