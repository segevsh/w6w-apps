import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-members-list.ts";

Deno.test("team-members-list: pages by team id and requires one", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { list_info: { num_pages: 1 }, team_members: [{ account_id: "a1" }] },
  }]);
  assertEquals(await action.execute!({ teamId: "t1" }, ctx), [{ account_id: "a1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/v3/team/members/t1");

  const missing = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, missing.ctx), Error, "`teamId`");
  assertEquals(missing.calls.length, 0);
});
