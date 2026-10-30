import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-profile.ts";

test("user-get-profile: GETs /users.profile.get and unwraps `profile`", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, profile: { display_name: "cj" } } }]);
  const result = await action.execute!({ user: "U1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/users.profile.get");
  assertEquals(url.searchParams.get("user"), "U1");
  assertEquals(result, { display_name: "cj" });
});
