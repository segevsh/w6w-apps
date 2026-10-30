import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-team-membership.ts";

test("get-team-membership: GETs /team/memberships/{membershipId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tm1" } }]);
  const result = await action.execute({ membershipId: "tm1" }, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/team/memberships/tm1");
  assertEquals(result, { id: "tm1" });
});
