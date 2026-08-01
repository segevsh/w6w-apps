import { assertEquals } from "@std/assert";
import { mockSupabaseCtx } from "../_helpers.ts";
import action from "../../actions/rows-count.ts";

Deno.test("rows-count: issues a HEAD with Prefer: count=exact and reads Content-Range", async () => {
  const { ctx, calls } = mockSupabaseCtx([{
    headers: { "content-range": "0-0/42" },
  }]);
  const out = await action.execute({ table: "todos", filters: "done=is.false" }, ctx);
  assertEquals(calls[0].method, "HEAD");
  assertEquals(calls[0].headers["prefer"], "count=exact");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("done"), "is.false");
  assertEquals(out, { count: 42 });
});

Deno.test("rows-count: a `*` total (count not requested/known) reports null, not NaN", async () => {
  const { ctx } = mockSupabaseCtx([{ headers: { "content-range": "0-9/*" } }]);
  const out = await action.execute({ table: "todos" }, ctx);
  assertEquals(out, { count: null });
});
