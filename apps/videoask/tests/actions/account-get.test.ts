import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("account-get: GETs /me and returns the profile verbatim", async () => {
  const { ctx, calls } = mockCtx([
    { body: { user_id: "u1", username: "John Doe", email: "john@example.com" } },
  ]);
  const out = await accountGet.execute({}, ctx) as { user_id: string; username: string };
  assertEquals(pathOf(calls[0].url), "/me");
  assertEquals(out.user_id, "u1");
  assertEquals(out.username, "John Doe");
});
