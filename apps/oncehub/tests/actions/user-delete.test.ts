import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-delete.ts";

test("user-delete: DELETEs /users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "USR-1", deleted: true } }]);
  const result = await action.execute({ id: "USR-1" }, ctx) as { deleted?: boolean };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/users/USR-1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result.deleted, true);
});
