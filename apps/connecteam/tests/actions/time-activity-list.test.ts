import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import timeActivityList from "../../actions/time-activity-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("time-activity-list: GETs time-activities with the required date range", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ timeActivitiesByUsers: [] }) }]);
  await timeActivityList.execute(
    { timeClockId: 5, startDate: "2026-01-01", endDate: "2026-01-31" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/time-clock/v1/time-clocks/5/time-activities");
  assertEquals(
    queryOf(calls[0].url),
    { startDate: "2026-01-01", endDate: "2026-01-31" },
  );
});

test("time-activity-list: activityTypes is a repeated-key array filter", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ timeActivitiesByUsers: [] }) }]);
  await timeActivityList.execute(
    {
      timeClockId: 5,
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      activityTypes: ["shift", "manual_break"],
    },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).activityTypes, ["shift", "manual_break"]);
});
