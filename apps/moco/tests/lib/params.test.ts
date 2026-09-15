import { assertEquals, assertThrows } from "@std/assert";
import { customProperties, parseList } from "../../lib/params.ts";

Deno.test("parseList: splits a comma-separated string and trims", () => {
  assertEquals(parseList("VIP, Enterprise ,A-Kunde"), ["VIP", "Enterprise", "A-Kunde"]);
});

Deno.test("parseList: passes an array through, trimmed and filtered", () => {
  assertEquals(parseList(["VIP", " ", "Enterprise"]), ["VIP", "Enterprise"]);
});

Deno.test("parseList: undefined/empty input yields undefined", () => {
  assertEquals(parseList(undefined), undefined);
  assertEquals(parseList(""), undefined);
  assertEquals(parseList(","), undefined);
});

Deno.test("customProperties: accepts the flat map, as a string or object", () => {
  assertEquals(customProperties({ Sector: "Automotive" }), { Sector: "Automotive" });
  assertEquals(customProperties('{"Sector":"Automotive"}'), { Sector: "Automotive" });
});

Deno.test("customProperties: undefined/empty input yields undefined", () => {
  assertEquals(customProperties(undefined), undefined);
  assertEquals(customProperties(""), undefined);
  assertEquals(customProperties({}), undefined);
});

Deno.test("customProperties: rejects a non-object payload", () => {
  assertThrows(() => customProperties("[1,2,3]"), Error, "must be a JSON object");
  assertThrows(() => customProperties([1, 2, 3]), Error, "must be a JSON object");
});
