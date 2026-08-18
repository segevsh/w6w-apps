import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-update.ts";

Deno.test("board-update: PATCHes only what was set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await action.execute!({ boardId: "b1", name: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});

Deno.test("board-update: refuses a no-op", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ boardId: "b1" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});
