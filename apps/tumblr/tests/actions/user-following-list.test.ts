import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userFollowingList from "../../actions/user-following-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("user-following-list: calls GET /v2/user/following", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ blogs: [], total_blogs: 0 }) }]);
  await userFollowingList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/user/following");
});
