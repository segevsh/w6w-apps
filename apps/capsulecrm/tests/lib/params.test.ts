import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { pageParams, pageQuery } from "../../lib/params.ts";

test("pageParams: declares page and perPage", () => {
  assertEquals(pageParams.map((p) => p.key), ["page", "perPage"]);
});

test("pageQuery: passes page/perPage through untouched", () => {
  assertEquals(pageQuery({ page: 2, perPage: 100 }), { page: 2, perPage: 100 });
  assertEquals(pageQuery({}), { page: undefined, perPage: undefined });
});
