import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-draft.ts";

test("delete-draft: DELETEs users/me/drafts/{id} and returns success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ draftId: "d1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/drafts/d1");
  assertEquals(result, { success: true });
});
