import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import a from "../../actions/list-groups.ts";
import { BASE, run } from "../_helpers.ts";

test("list-groups: GET groups.list with paging", async () => {
  const { call, query } = await run(a, { count: 25, offset: 50, sort: '{"name":-1}' }, {
    groups: [],
  });
  assertEquals(call.url.split("?")[0], `${BASE}/groups.list`);
  assertEquals(query.get("count"), "25");
  assertEquals(query.get("offset"), "50");
  assertEquals(query.get("sort"), '{"name":-1}');
});

test("list-groups: no params means a bare URL", async () => {
  const { call } = await run(a, {});
  assertEquals(call.url, `${BASE}/groups.list`);
});
