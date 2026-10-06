import { assertEquals } from "@std/assert";
import { buildUrl, compact, csv, quotedList } from "../../lib/client.ts";

Deno.test("csv / quotedList", () => {
  assertEquals(csv(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(["x", " y "]), ["x", "y"]);
  assertEquals(csv(undefined), []);
  assertEquals(quotedList(""), undefined);
  assertEquals(quotedList('a"b,c'), '"ab","c"');
});

Deno.test("compact drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: [] }), {
    d: false,
    e: 0,
  });
});

Deno.test("buildUrl encodes and omits empties", () => {
  assertEquals(
    buildUrl("/x", { a: "1 2", b: undefined, c: "" }),
    "https://api.hyros.com/v1/api/v1.0/x?a=1%202",
  );
});
