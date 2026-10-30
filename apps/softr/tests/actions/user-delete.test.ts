import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userDelete from "../../actions/user-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("user-delete: DELETEs /users/{email}", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await userDelete.execute({ domain: "yourdomain.com", email: "user@softr.io" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/users/user%40softr.io");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].headers["softr-domain"], "yourdomain.com");
});

test("user-delete: is marked idempotent", () => {
  assertEquals(userDelete.idempotent, true);
});
