import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-remove-member.ts";

test("board-remove-member: DELETEs the member route", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ id: "b1", idMember: "m1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/1/boards/b1/members/m1");
});
