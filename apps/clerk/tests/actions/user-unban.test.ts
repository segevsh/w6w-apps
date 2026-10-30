import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-unban.ts";

test("user-unban: POSTs to /users/{id}/unban", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user_1", banned: false } }]);
  await action.execute!({ userId: "user_1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/users/user_1/unban");
});
