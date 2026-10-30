import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-current.ts";

test("user-get-current: GETs /users/current", async () => {
  const { ctx, calls } = mockCtx([{ body: { user: { id: 1, name: "Scott Spacey" } } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/users/current");
  assertEquals(out, { user: { id: 1, name: "Scott Spacey" } });
});
