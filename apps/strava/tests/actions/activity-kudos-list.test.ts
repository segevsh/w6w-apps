import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/activity-kudos-list.ts";

test("activity-kudos-list: GETs kudoers for the activity", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ firstname: "Marianne" }] }]);
  const out = await action.execute({ activityId: "42" }, ctx);
  assertEquals(out, [{ firstname: "Marianne" }]);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v3/activities/42/kudos");
});
