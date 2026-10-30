import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import usersGet from "../../actions/users-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("users-get: GETs /users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await usersGet.execute({ userId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/users/1");
});

test("users-get: accepts the literal 'me'", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await usersGet.execute({ userId: "me" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/users/me");
});
