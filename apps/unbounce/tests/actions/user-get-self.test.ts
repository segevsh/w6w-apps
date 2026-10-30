import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userGetSelf from "../../actions/user-get-self.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("user-get-self: calls GET /users/self", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", email: "a@b.com" } }]);
  const out = await userGetSelf.execute({}, ctx) as { email: string };

  assertEquals(pathOf(calls[0].url), "/users/self");
  assertEquals(out.email, "a@b.com");
});
