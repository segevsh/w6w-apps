import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-label.ts";

test("delete-label: DELETEs users/me/labels/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ labelId: "Label_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/labels/Label_1");
  assertEquals(result, { success: true });
});
