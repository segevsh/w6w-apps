import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-move.ts";

Deno.test("item-move: sends position and parent, the endpoint's only two fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "i1" } }], { display: {} });
  await action.execute!({ boardId: "b1", itemId: "i1", x: 100, y: 200, parentId: "f1" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {
    position: { x: 100, y: 200 },
    parent: { id: "f1" },
  });
});

Deno.test("item-move: a move with nothing to move is refused", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ boardId: "b1", itemId: "i1" }, ctx),
    Error,
    "nothing else to move",
  );
  assertEquals(calls.length, 0);
});
