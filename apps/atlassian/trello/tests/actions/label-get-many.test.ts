import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/label-get-many.ts";

test("label-get-many: GETs /boards/{id}/labels", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "lb1" }] }]);
  assertEquals(await action.execute({ idBoard: "b1" }, ctx), [{ id: "lb1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/1/boards/b1/labels");
});
