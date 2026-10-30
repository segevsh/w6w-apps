import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("user-get: fetches /user/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 456, email: "agent@kvcore.com" } }]);
  const out = await userGet.execute({ user_id: "456" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/public/user/456");
  assertEquals(out, { id: 456, email: "agent@kvcore.com" });
});
