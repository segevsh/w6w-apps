import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import timeActivityDelete from "../../actions/time-activity-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("time-activity-delete: DELETEs the specific time activity and returns the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await timeActivityDelete.execute({ timeClockId: 5, timeActivityId: "ta_1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/time-clock/v1/time-clocks/5/time-activities/ta_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});

test("time-activity-delete: idempotent", () => {
  assertEquals(timeActivityDelete.idempotent, true);
});
