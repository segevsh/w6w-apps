import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/remove-member-role.ts";

test("remove-member-role: DELETEs /guilds/{gid}/members/{uid}/roles/{rid}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!(
    { guildId: "g1", userId: "u1", roleId: "r1" },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/v10/guilds/g1/members/u1/roles/r1",
  );
  assertEquals(result, { success: true });
});
