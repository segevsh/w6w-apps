import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-team.ts";

test("delete-team: DELETEs /teams/{teamId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ teamId: "t1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://webexapis.com/v1/teams/t1");
  assertEquals(result, { deleted: true });
});
