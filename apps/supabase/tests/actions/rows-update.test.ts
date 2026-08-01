import { assertEquals, assertRejects } from "@std/assert";
import { mockSupabaseCtx } from "../_helpers.ts";
import action from "../../actions/rows-update.ts";

Deno.test("rows-update: PATCHes with the filter in the query string and the set body", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ body: [{ id: 5, status: "done" }] }]);
  const out = await action.execute({
    table: "todos",
    filters: "id=eq.5",
    set: { status: "done" },
  }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).searchParams.get("id"), "eq.5");
  assertEquals(JSON.parse(calls[0].body!), { status: "done" });
  assertEquals(calls[0].headers["prefer"], "return=representation");
  assertEquals(out, { rows: [{ id: 5, status: "done" }] });
});

Deno.test("rows-update: refuses a blank filter without making a request", async () => {
  const { ctx, calls } = mockSupabaseCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({ table: "todos", filters: "  ", set: { status: "done" } }, ctx),
    Error,
    "filters",
  );
  assertEquals(calls.length, 0);
});
