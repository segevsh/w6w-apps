import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import activityGet from "../../actions/activity-get.ts";
import { mockCtx } from "../_helpers.ts";

test("activity-get: fetches GET /activities/:id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { activity: { id: 59, subject: "first google sync" } },
  }]);
  const out = await activityGet.execute({ activityId: 59 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/activities/59");
  assertEquals(out.activity.subject, "first google sync");
});
