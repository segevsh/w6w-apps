import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-current-user.ts";

test("get-current-user: GETs /users/me", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4, firstName: "Vernon", role: "owner" } }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/users/me");
  assertEquals(out, { id: 4, firstName: "Vernon", role: "owner" });
});
