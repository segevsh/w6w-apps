import { assertEquals } from "@std/assert";
import { buildQuery, errorText, jsonValue, reply, strList, vendorError } from "../../lib/client.ts";

Deno.test("buildQuery: skips unset values and encodes bracket keys", () => {
  assertEquals(buildQuery({ a: 1, b: undefined, c: "", "page[num]": 2 }), "?a=1&page%5Bnum%5D=2");
  assertEquals(buildQuery(undefined), "");
});

Deno.test("strList / jsonValue: accept text or parsed values", () => {
  assertEquals(strList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(strList([]), undefined);
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("nope"), "nope");
  assertEquals(jsonValue(" "), undefined);
});

Deno.test("vendorError / errorText: plural and singular forms", () => {
  assertEquals(vendorError({ errors: [{ code: "c", title: "t" }] })?.code, "c");
  assertEquals(vendorError({ error: { code: "m", message: "msg" } })?.title, "msg");
  assertEquals(errorText({ errors: [{ code: "c", title: "t", detail: "d" }] }), "c: t (d)");
  assertEquals(errorText(undefined, " raw text "), "raw text");
});

Deno.test("reply: surfaces cursor and next page hints", () => {
  assertEquals(reply({ data: [], meta: { pagination: { next_cursor: "n" } } }).nextCursor, "n");
  assertEquals(
    reply({ data: [], meta: { pagination: { page_num: 3, page_count: 3 } } }).nextPage,
    undefined,
  );
});
