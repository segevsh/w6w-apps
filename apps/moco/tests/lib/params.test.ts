import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import { customProperties, parseList } from "../../lib/params.ts";

test("parseList: splits a comma-separated string and trims", () => {
  assertEquals(parseList("VIP, Enterprise ,A-Kunde"), ["VIP", "Enterprise", "A-Kunde"]);
});

test("parseList: passes an array through, trimmed and filtered", () => {
  assertEquals(parseList(["VIP", " ", "Enterprise"]), ["VIP", "Enterprise"]);
});

test("parseList: undefined/empty input yields undefined", () => {
  assertEquals(parseList(undefined), undefined);
  assertEquals(parseList(""), undefined);
  assertEquals(parseList(","), undefined);
});

test("customProperties: accepts the flat map, as a string or object", () => {
  assertEquals(customProperties({ Sector: "Automotive" }), { Sector: "Automotive" });
  assertEquals(customProperties('{"Sector":"Automotive"}'), { Sector: "Automotive" });
});

test("customProperties: undefined/empty input yields undefined", () => {
  assertEquals(customProperties(undefined), undefined);
  assertEquals(customProperties(""), undefined);
  assertEquals(customProperties({}), undefined);
});

test("customProperties: rejects a non-object payload", () => {
  assertThrows(() => customProperties("[1,2,3]"), Error, "must be a JSON object");
  assertThrows(() => customProperties([1, 2, 3]), Error, "must be a JSON object");
});
