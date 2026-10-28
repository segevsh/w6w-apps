import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-conversations.ts";

Deno.test("list-conversations: GET /me/conversations?platform=messenger with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "t_1", updated_time: "2026-10-01" }] } }]);
  const out = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v26.0/me/conversations");
  assertEquals(url.searchParams.get("platform"), "messenger");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.has("user_id"), false);
  assertEquals(url.searchParams.has("after"), false);
  assertEquals(out.data[0].id, "t_1");
});

Deno.test("list-conversations: userId, cursor, limit and pageId are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ userId: "psid", cursor: "CUR", limit: 5, pageId: "77" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v26.0/77/conversations");
  assertEquals(url.searchParams.get("user_id"), "psid");
  assertEquals(url.searchParams.get("after"), "CUR");
  assertEquals(url.searchParams.get("limit"), "5");
});
