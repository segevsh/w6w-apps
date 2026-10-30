import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

test("user-list: GETs /users with the email filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [] } }]);
  await action.execute({ email: "a@b.com", limit: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/users");
  assertEquals(url.searchParams.get("email"), "a@b.com");
  assertEquals(url.searchParams.get("limit"), "5");
});
