import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

test("user-get: fetches by id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "user_1", email_verified: false, last_sign_in_at: null },
  }]);
  const result = await action.execute!({ userId: "user_1" }, ctx) as { email_verified: boolean };
  assertEquals(calls[0].url, "https://api.workos.com/user_management/users/user_1");
  assertEquals(result.email_verified, false);
});

test("user-get: needs a user id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "userId");
  assertEquals(calls.length, 0);
});

/** A seat audit built on created dates counts people who never came back. */
test("user-get: points at last sign-in as the honest usage signal", () => {
  assert(/last_sign_in_at/.test(action.description!), action.description);
});
