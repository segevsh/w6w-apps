import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import usersDelete from "../../actions/users-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("users-delete: DELETEs /users/{id} and returns the 204 status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await usersDelete.execute({ id: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/public/v1/users/1");
  assertEquals(out, { status: 204 });
});

test("users-delete: is idempotent", () => {
  assertEquals(usersDelete.idempotent, true);
});
