import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userActivate from "../../actions/user-activate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("user-activate: POSTs /users/{email}/activate", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await userActivate.execute({ domain: "yourdomain.com", email: "user@softr.io" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/users/user%40softr.io/activate");
  assertEquals(calls[0].method, "POST");
});

test("user-activate: is marked idempotent", () => {
  assertEquals(userActivate.idempotent, true);
});
