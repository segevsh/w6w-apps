import { assertEquals } from "@std/assert";
import action from "../../actions/team-member-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("team-member-list: GETs the team's members sub-path", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "m-1" }, { id: "m-2" }]) }]);
  const out = await action.execute({ teamId: "t-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/teams/t-1/members");
  assertEquals(out.items.length, 2);
});

Deno.test("team-member-list: the cursor is forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ teamId: "t-1", pageCursor: "cur-3" }, ctx);
  assertEquals(queryOf(calls[0].url), { pageCursor: "cur-3" });
});
