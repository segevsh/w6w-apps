import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-profile.ts";

test("user-get-profile: GETs /me", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", display_name: "Alice" } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/me");
  assertEquals(out, { id: "u1", display_name: "Alice" });
});
