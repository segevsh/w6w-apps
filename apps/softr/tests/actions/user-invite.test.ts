import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userInvite from "../../actions/user-invite.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("user-invite: POSTs /users/{email}/invite", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await userInvite.execute({ domain: "yourdomain.com", email: "user@softr.io" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/users/user%40softr.io/invite");
  assertEquals(calls[0].method, "POST");
});

/** Sending an invite email is not free of side effects, so it is not idempotent. */
test("user-invite: is explicitly not idempotent", () => {
  assertEquals(userInvite.idempotent, false);
});
