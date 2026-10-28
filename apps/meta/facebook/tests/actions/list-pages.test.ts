import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-pages.ts";

Deno.test("list-pages: GETs /me/accounts with fields", async () => {
  const body = { data: [{ id: "p1", name: "My Page" }], paging: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "graph.facebook.com");
  assertEquals(url.pathname, "/v23.0/me/accounts");
  assertEquals(url.searchParams.get("fields"), "id,name,category,access_token,tasks");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("list-pages: omits authorization when no override is provided (runtime injects it)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!({}, ctx);
  assert(!("authorization" in calls[0].headers), "auth must be injected by the sign hook, not us");
});

Deno.test("list-pages: forwards cursor and limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!({ cursor: "cursor-abc", limit: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("after"), "cursor-abc");
  assertEquals(url.searchParams.get("limit"), "10");
});
