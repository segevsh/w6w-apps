import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-delete.ts";

test("user-delete: DELETEs the user only when confirmed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user_1", deleted: true } }]);
  await action.execute!({ userId: "user_1", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/users/user_1");
});

test("user-delete: without confirm=true, nothing is sent", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute!({ userId: "user_1" }, ctx),
    Error,
  );
  assert(/confirm/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});
