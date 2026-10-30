import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("user-get: calls GET /users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", email: "a@b.com" } }]);
  const out = await userGet.execute({ userId: "u1" }, ctx) as { email: string };

  assertEquals(pathOf(calls[0].url), "/users/u1");
  assertEquals(out.email, "a@b.com");
});
