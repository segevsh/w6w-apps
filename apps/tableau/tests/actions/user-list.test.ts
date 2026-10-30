import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

test("user-list: unwraps a single user and targets the right path", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { users: { user: { id: "u1", name: "Ada", siteRole: "Explorer" } } } }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({}, ctx) as { users: unknown[] };
  assertEquals(result.users, [{ id: "u1", name: "Ada", siteRole: "Explorer" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/3.21/sites/site-1/users");
});
