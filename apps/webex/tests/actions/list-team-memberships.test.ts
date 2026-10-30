import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-team-memberships.ts";

test("list-team-memberships: GETs /team/memberships with teamId", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "tm1" }] } }]);
  const result = await action.execute({ teamId: "t1" }, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/team/memberships?teamId=t1");
  assertEquals(result, [{ id: "tm1" }]);
});
