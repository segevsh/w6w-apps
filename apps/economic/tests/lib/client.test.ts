import { assertEquals } from "@std/assert";
import { buildQuery, compact, errorText, jsonValue, pageOf, ref } from "../../lib/client.ts";

Deno.test("buildQuery skips unset and empty values", () => {
  assertEquals(buildQuery({ a: 1, b: undefined, c: "", d: "x y" }), "?a=1&d=x+y");
  assertEquals(buildQuery(undefined), "");
});

Deno.test("compact drops undefined and empty strings but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: "", c: false, d: 0 }), { c: false, d: 0 });
});

Deno.test("jsonValue parses JSON text, passes junk and objects through", () => {
  assertEquals(jsonValue('[{"a":1}]'), [{ a: 1 }]);
  assertEquals(jsonValue("not json"), "not json");
  assertEquals(jsonValue(" "), undefined);
  assertEquals(jsonValue([1]), [1]);
});

Deno.test("ref builds a reference object or nothing", () => {
  assertEquals(ref("customerNumber", 3), { customerNumber: 3 });
  assertEquals(ref("customerNumber", undefined), undefined);
});

Deno.test("errorText: message, code and nested validation lines", () => {
  assertEquals(errorText({ message: "m", errorCode: "E1" }), "m (E1)");
  assertEquals(errorText(null, "raw text"), "raw text");
  assertEquals(
    errorText({
      message: "Validation error.",
      errors: { recipient: { vatZone: { errors: [{ message: "required" }] } } },
    }),
    "Validation error. — recipient.vatZone: required",
  );
});

Deno.test("pageOf: no collection is an empty page; nextPage drives hasMore", () => {
  assertEquals(pageOf({}), { items: [], count: 0, total: 0, hasMore: false });
  assertEquals(
    pageOf({ collection: [1], pagination: { nextPage: "u", skipPages: 4, results: 99 } }),
    {
      items: [1],
      count: 1,
      total: 99,
      hasMore: true,
      nextSkipPages: 5,
    },
  );
});
