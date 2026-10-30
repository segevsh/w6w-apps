import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userList from "../../actions/user-list.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

test("user-list: posts to /v2/users/list and returns the cursor envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [], hasNextPage: false, cursor: null } }]);
  const out = await userList.execute({ limit: 100 }, ctx) as { users: unknown[] };

  assertEquals(calls[0].url, "https://canny.io/api/v2/users/list");
  assertEquals(bodyOf(calls[0]), { limit: 100 });
  assertEquals(out.users, []);
});
