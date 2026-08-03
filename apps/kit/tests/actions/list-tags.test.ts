import { assert, assertEquals } from "@std/assert";
import action from "../../actions/list-tags.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-tags: GETs /v4/tags with no params by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { tags: [], pagination: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/tags");
  assertEquals([...url.searchParams.keys()], []);
});

Deno.test("list-tags: forwards include and cursor pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { tags: [] } }]);
  await action.execute!({ include: "subscriber_count", perPage: 50, before: "c1" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("include"), "subscriber_count");
  assertEquals(p.get("per_page"), "50");
  assertEquals(p.get("before"), "c1");
  assert(!p.has("after"));
});

Deno.test("list-tags: returns rows plus the pagination envelope", async () => {
  const body = { tags: [{ id: 1, name: "VIP" }], pagination: { has_next_page: false } };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
});
