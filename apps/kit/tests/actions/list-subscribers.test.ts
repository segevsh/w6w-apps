import { assert, assertEquals } from "@std/assert";
import action from "../../actions/list-subscribers.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-subscribers: GETs /v4/subscribers with no params by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscribers: [], pagination: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/subscribers");
  assertEquals([...url.searchParams.keys()], [], "should not invent defaults Kit already has");
});

Deno.test("list-subscribers: forwards every filter under Kit's snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscribers: [] } }]);
  await action.execute!({
    emailAddress: "ada@example.com",
    status: "all",
    createdAfter: "2026-01-01",
    createdBefore: "2026-02-01",
    updatedAfter: "2026-03-01",
    updatedBefore: "2026-04-01",
    sortField: "updated_at",
    sortOrder: "desc",
    include: "tags,location",
    slim: true,
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("email_address"), "ada@example.com");
  assertEquals(p.get("status"), "all");
  assertEquals(p.get("created_after"), "2026-01-01");
  assertEquals(p.get("created_before"), "2026-02-01");
  assertEquals(p.get("updated_after"), "2026-03-01");
  assertEquals(p.get("updated_before"), "2026-04-01");
  assertEquals(p.get("sort_field"), "updated_at");
  assertEquals(p.get("sort_order"), "desc");
  assertEquals(p.get("include"), "tags,location");
  assertEquals(p.get("slim"), "true");
});

Deno.test("list-subscribers: forwards cursor pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscribers: [] } }]);
  await action.execute!({ after: "cursor-1", perPage: 100, includeTotalCount: true }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("after"), "cursor-1");
  assertEquals(p.get("per_page"), "100");
  assertEquals(p.get("include_total_count"), "true");
  assert(!p.has("before"));
});

Deno.test("list-subscribers: is a search action returning the pagination envelope", async () => {
  assertEquals(action.type, "search");
  const body = { subscribers: [{ id: 1 }], pagination: { has_next_page: true, end_cursor: "c" } };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
});
