import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("user-get: GETs /users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "user_1", username: "j" } }]);
  const out = await userGet.execute({ id: "j" }, ctx) as { username: string };
  assertEquals(pathOf(calls[0].url), "/users/j");
  assertEquals(out.username, "j");
});

test("user-get: id=me is a plain passthrough, no special-casing", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "user_1" } }]);
  await userGet.execute({ id: "me" }, ctx);
  assertEquals(pathOf(calls[0].url), "/users/me");
});

test("user-get: accountId narrows to account-specific profile overrides", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "user_1" } }]);
  await userGet.execute({ id: "me", accountId: "biz_1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("account_id"), "biz_1");
});
