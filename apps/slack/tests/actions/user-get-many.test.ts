import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-many.ts";

test("user-get-many: GETs /users.list with limit default", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, members: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/users.list");
  assertEquals(url.searchParams.get("limit"), "100");
});
