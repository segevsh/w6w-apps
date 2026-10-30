import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import activityList from "../../actions/activity-list.ts";
import { mockCtx } from "../_helpers.ts";

test("activity-list: fetches GET /activities?start_date=&end_date=", async () => {
  const { ctx, calls } = mockCtx([{ body: { activities: [{ id: 231, subject: "Lunch" }] } }]);
  const out = await activityList.execute(
    { startDate: "2019-05-26", endDate: "2020-07-05" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/public/v1/activities");
  assertEquals(url.searchParams.get("start_date"), "2019-05-26");
  assertEquals(url.searchParams.get("end_date"), "2020-07-05");
  assertEquals(out.activities[0].subject, "Lunch");
});

test("activity-list: omits unset filters entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { activities: [] } }]);
  await activityList.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
