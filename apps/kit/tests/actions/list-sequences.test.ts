import { assertEquals } from "@std/assert";
import action from "../../actions/list-sequences.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-sequences: GETs /v4/sequences with no params by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { sequences: [], pagination: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/sequences");
  assertEquals([...url.searchParams.keys()], []);
});

Deno.test("list-sequences: forwards include=stats and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { sequences: [] } }]);
  await action.execute!({ include: "stats", after: "c1", perPage: 10 }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("include"), "stats");
  assertEquals(p.get("after"), "c1");
  assertEquals(p.get("per_page"), "10");
});

Deno.test("list-sequences: returns rows plus the pagination envelope", async () => {
  const body = { sequences: [{ id: 3, name: "Welcome" }], pagination: { has_next_page: false } };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
});
