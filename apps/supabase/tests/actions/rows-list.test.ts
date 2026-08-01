import { assertEquals } from "@std/assert";
import { mockSupabaseCtx } from "../_helpers.ts";
import action from "../../actions/rows-list.ts";

Deno.test("rows-list: builds select/order/limit/offset and appends raw filters", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ body: [{ id: 1 }] }]);
  const out = await action.execute({
    table: "todos",
    select: "id,name",
    filters: "age=lt.13&student=is.true",
    order: "created_at.desc",
    limit: 10,
    offset: 5,
  }, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v1/todos");
  assertEquals(url.hostname, "abcdefgh.supabase.co");
  const q = url.searchParams;
  assertEquals(q.get("select"), "id,name");
  assertEquals(q.get("order"), "created_at.desc");
  assertEquals(q.get("limit"), "10");
  assertEquals(q.get("offset"), "5");
  assertEquals(q.get("age"), "lt.13");
  assertEquals(q.get("student"), "is.true");
  assertEquals(out, { rows: [{ id: 1 }] });
});

Deno.test("rows-list: defaults select to `*` and omits unset paging params", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ body: [] }]);
  await action.execute({ table: "todos" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("select"), "*");
  assertEquals(q.has("order"), false);
  assertEquals(q.has("limit"), false);
  assertEquals(q.has("offset"), false);
});

Deno.test("rows-list: never sets Authorization — sign injects it", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ body: [] }]);
  await action.execute({ table: "todos" }, ctx);
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals("apikey" in calls[0].headers, false);
});
