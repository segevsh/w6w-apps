import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import { asOptionalJson, flattenFilter, pageQuery } from "../../lib/params.ts";

test("flattenFilter: flattens { attr: { op: value } } to filter[attr][op]", () => {
  assertEquals(
    flattenFilter({ starts_at: { gte: "1980-11-16T09:00:00+00:00" } }),
    { "filter[starts_at][gte]": "1980-11-16T09:00:00+00:00" },
  );
});

test("flattenFilter: shorthand { attr: value } becomes filter[attr]", () => {
  assertEquals(flattenFilter({ archived: false }), { "filter[archived]": "false" });
});

test("flattenFilter: drops null/undefined leaves and handles no filter", () => {
  assertEquals(flattenFilter({ name: { eq: null } }), {});
  assertEquals(flattenFilter(undefined), {});
});

test("pageQuery: maps to page[number]/page[size]", () => {
  assertEquals(
    pageQuery({ pageNumber: 2, pageSize: 25 }),
    { "page[number]": 2, "page[size]": 25 },
  );
});

test("asOptionalJson: parses a JSON string param", () => {
  assertEquals(asOptionalJson<{ a: number }>('{"a":1}', "filter"), { a: 1 });
});

test("asOptionalJson: passes through an already-parsed value", () => {
  assertEquals(asOptionalJson<{ a: number }>({ a: 1 }, "filter"), { a: 1 });
});

test("asOptionalJson: returns undefined for blank input", () => {
  assertEquals(asOptionalJson(undefined, "filter"), undefined);
  assertEquals(asOptionalJson("", "filter"), undefined);
});

test("asOptionalJson: throws a labeled error for invalid JSON", () => {
  assertThrows(() => asOptionalJson("{not json", "filter"), Error, "filter is not valid JSON");
});
