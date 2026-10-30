import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import findUser from "../../actions/find-user.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("find-user: queries /find/users by email", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "u1", email: "a@b.com" }] }]);
  const out = await findUser.execute({ email: "a@b.com" }, ctx) as { users: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/find/users");
  assertEquals(queryOf(calls[0].url), { email: "a@b.com" });
  assertEquals(out.users.length, 1);
});

test("find-user: an empty match array is a valid (not-found) result", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const out = await findUser.execute({ email: "nobody@b.com" }, ctx) as { users: unknown[] };
  assertEquals(out.users, []);
});
