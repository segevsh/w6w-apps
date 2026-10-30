import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import { encodeFilter, listQuery } from "../../lib/params.ts";

test("listQuery: passes through the documented list params", () => {
  assertEquals(
    listQuery({
      size: 25,
      from: 10,
      sort_field: "date_updated",
      sort_direction: "asc",
      filter: { must: [{ term: { first_name: "John" } }] },
      actor: "sam@company.com",
    }),
    {
      size: 25,
      from: 10,
      sort_field: "date_updated",
      sort_direction: "asc",
      filter: '{"must":[{"term":{"first_name":"John"}}]}',
      actor: "sam@company.com",
    },
  );
});

test("listQuery: omits fields the caller left unset", () => {
  assertEquals(listQuery({}), {
    size: undefined,
    from: undefined,
    sort_field: undefined,
    sort_direction: undefined,
    filter: undefined,
    actor: undefined,
  });
});

test("encodeFilter: accepts an already-parsed object", () => {
  assertEquals(encodeFilter({ must: [] }), '{"must":[]}');
});

test("encodeFilter: accepts a JSON string a user typed", () => {
  assertEquals(encodeFilter('{"must":[]}'), '{"must":[]}');
});

test('encodeFilter: absence is absence, not the literal string "undefined"', () => {
  assertEquals(encodeFilter(undefined), undefined);
  assertEquals(encodeFilter(""), undefined);
});

test("encodeFilter: an unparsable string throws rather than sending garbage", () => {
  assertThrows(() => encodeFilter("{not json"), Error, "filter is not valid JSON");
});
