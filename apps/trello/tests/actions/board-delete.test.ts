import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-delete.ts";

Deno.test("board-delete: DELETEs /boards/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { _value: null } }]);
  await action.execute({ id: "b1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/1/boards/b1");
});
