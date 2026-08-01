import { assertEquals, assertRejects } from "@std/assert";
import { mockSupabaseCtx } from "../_helpers.ts";
import action from "../../actions/row-get.ts";

Deno.test("row-get: requests a singular object via the pgrst.object Accept header", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ body: { id: 5, name: "abc" } }]);
  const out = await action.execute({ table: "todos", filters: "id=eq.5" }, ctx);
  assertEquals(calls[0].headers["accept"], "application/vnd.pgrst.object+json");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("id"), "eq.5");
  assertEquals(out, { row: { id: 5, name: "abc" } });
});

Deno.test("row-get: surfaces PostgREST's 406 when the filter isn't exactly one row", async () => {
  const { ctx } = mockSupabaseCtx([{
    status: 406,
    statusText: "Not Acceptable",
    body: '{"message":"JSON object requested, multiple (or no) rows returned"}',
  }]);
  await assertRejects(
    async () => await action.execute!({ table: "todos", filters: "id=eq.5" }, ctx),
    Error,
    "multiple (or no) rows returned",
  );
});
