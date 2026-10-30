import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-team.ts";

test("get-team: GETs /teams/{teamId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  const result = await action.execute({ teamId: "t1" }, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/teams/t1");
  assertEquals(result, { id: "t1" });
});
