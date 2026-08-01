import { assertEquals, assertRejects } from "@std/assert";
import { mockSupabaseCtx } from "../_helpers.ts";
import action from "../../actions/rows-delete.ts";

Deno.test("rows-delete: DELETEs with the filter in the query string", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ body: [{ id: 5 }] }]);
  const out = await action.execute({ table: "todos", filters: "id=eq.5" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).searchParams.get("id"), "eq.5");
  assertEquals(calls[0].headers["prefer"], "return=representation");
  assertEquals(out, { rows: [{ id: 5 }] });
});

Deno.test("rows-delete: refuses a blank filter without making a request", async () => {
  const { ctx, calls } = mockSupabaseCtx([]);
  await assertRejects(
    async () => await action.execute!({ table: "todos", filters: "" }, ctx),
    Error,
    "filters",
  );
  assertEquals(calls.length, 0);
});
