import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-delete.ts";

Deno.test("item-delete: DELETEs and reports what went", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display: {} });
  const result = await action.execute!({ boardId: "b1", itemId: "i1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { id: "i1", deleted: true });
});

Deno.test("item-delete: both ids are required", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({ boardId: "b1" }, ctx), Error, "`itemId`");
  assertEquals(calls.length, 0);
});
