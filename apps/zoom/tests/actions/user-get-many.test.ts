import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-many.ts";

test("user-get-many: GETs /users with the status filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [] } }]);
  await action.execute({ status: "inactive" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/users");
  assertEquals(new URL(calls[0].url).searchParams.get("status"), "inactive");
});
