import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-group-subscribers.ts";

Deno.test("list-group-subscribers: GETs /api/groups/{id}/subscribers", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], links: {}, meta: {} } }]);
  await action.execute!({ groupId: "4243829086487936" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/groups/4243829086487936/subscribers");
  assertEquals(url.searchParams.get("limit"), "25");
});

Deno.test("list-group-subscribers: forwards the status filter and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ groupId: "1", status: "unsubscribed", cursor: "abc", limit: 50 }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("filter[status]"), "unsubscribed");
  assertEquals(params.get("cursor"), "abc");
  assertEquals(params.get("limit"), "50");
});

Deno.test("list-group-subscribers: pages by cursor, never by page number", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ groupId: "1" }, ctx);
  assert(!new URL(calls[0].url).searchParams.has("page"));
});
