import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { buildPersonBody } from "../../lib/person.ts";

test("buildPersonBody: drops unset fields", () => {
  assertEquals(buildPersonBody({ fullName: "Ada Lovelace" }), { fullName: "Ada Lovelace" });
});

test("buildPersonBody: passes arrays through untouched", () => {
  const body = buildPersonBody({
    fullName: "Ada",
    emails: ["ada@example.com"],
    phones: ["+1 555 0100"],
  });
  assertEquals(body, {
    fullName: "Ada",
    emails: ["ada@example.com"],
    phones: ["+1 555 0100"],
  });
});

test("buildPersonBody: passes customFields through untouched", () => {
  const body = buildPersonBody({ customFields: { Role: ["Investor"] } });
  assertEquals(body, { customFields: { Role: ["Investor"] } });
});
