import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("user-get: reads one user", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "9", email_address: "shawn@psych.co" } }]);
  const user = await userGet.execute({ userId: "9" }, ctx) as { email_address: string };
  assertEquals(pathOf(calls[0].url), "/v2/users/9");
  assertEquals(user.email_address, "shawn@psych.co");
});
