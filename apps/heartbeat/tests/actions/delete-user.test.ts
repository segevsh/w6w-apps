import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import deleteUser from "../../actions/delete-user.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("delete-user: DELETE /users with the email in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await deleteUser.execute({ email: "a@b.com" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v0/users");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com" });
});

test("delete-user: is idempotent by REST DELETE convention", () => {
  assertEquals(deleteUser.idempotent, true);
});
