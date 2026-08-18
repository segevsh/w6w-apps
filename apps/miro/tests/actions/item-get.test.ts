import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-get.ts";

Deno.test("item-get: works for any type — the response says which", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "i1", type: "sticky_note" } }], {
    display: {},
  });
  const result = await action.execute!({ boardId: "b1", itemId: "i1" }, ctx);
  assertEquals(calls[0].url, "https://api.miro.com/v2/boards/b1/items/i1");
  assertEquals((result as Record<string, unknown>).type, "sticky_note");
});

Deno.test("item-get: both ids are required", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({ boardId: "b1" }, ctx), Error, "`itemId`");
  assertEquals(calls.length, 0);
});
