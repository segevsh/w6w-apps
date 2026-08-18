import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sticky-note-update.ts";

Deno.test("sticky-note-update: changes content, which item-move cannot", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "i1" } }], { display: {} });
  await action.execute!({ boardId: "b1", itemId: "i1", content: "Shipped" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/sticky_notes/i1");
  assertEquals(JSON.parse(calls[0].body!), { data: { content: "Shipped" } });
});

Deno.test("sticky-note-update: refuses a no-op and the both-dimensions error", async () => {
  const noop = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ boardId: "b1", itemId: "i1" }, noop.ctx),
    Error,
    "nothing to update",
  );
  const both = mockCtx([], { display: {} });
  await assertRejects(
    async () =>
      await action.execute!({ boardId: "b1", itemId: "i1", width: 1, height: 1 }, both.ctx),
    Error,
    "not both",
  );
  assertEquals(noop.calls.length + both.calls.length, 0);
});
