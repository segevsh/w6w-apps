import { assertEquals } from "@std/assert";
import {
  buildQuery,
  compact,
  errorText,
  isErrorEnvelope,
  jsonValue,
  strList,
} from "../../lib/client.ts";

Deno.test("buildQuery: skips unset values, keeps false and 0", () => {
  assertEquals(
    buildQuery({ a: 1, b: undefined, c: "", d: false, e: 0, f: null }),
    "?a=1&d=false&e=0",
  );
  assertEquals(buildQuery(undefined), "");
});

Deno.test("errorText: errors array, error string, raw fallback", () => {
  assertEquals(errorText({ errors: ["a", "b"] }), "a; b");
  assertEquals(errorText({ error: "x" }), "x");
  assertEquals(errorText(undefined, "  raw text "), "raw text");
  assertEquals(isErrorEnvelope({ errors: [] }), true);
  assertEquals(isErrorEnvelope({ data: 1 }), false);
});

Deno.test("strList, jsonValue and compact", () => {
  assertEquals(strList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(strList([" x "]), ["x"]);
  assertEquals(strList(""), undefined);
  assertEquals(jsonValue("[1]"), [1]);
  assertEquals(jsonValue("not json"), "not json");
  assertEquals(compact({ a: 1, b: undefined, c: 0 }), { a: 1, c: 0 });
});
