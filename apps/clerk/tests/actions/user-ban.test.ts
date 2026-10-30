import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-ban.ts";

test("user-ban: POSTs to /users/{id}/ban", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user_1", banned: true } }]);
  await action.execute!({ userId: "user_1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/users/user_1/ban");
});
