import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-delete.ts";

test("board-delete: DELETEs and reports what went, since Miro answers 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display: {} });
  const result = await action.execute!({ boardId: "b1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { id: "b1", deleted: true });
});

test("board-delete: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`boardId`");
  assertEquals(calls.length, 0);
});
