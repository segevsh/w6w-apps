import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import campaignCancelSchedule from "../../actions/campaign-cancel-schedule.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("campaign-cancel-schedule: DELETEs /v2/campaigns/{id}/schedule", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, message: "Campaign scheduled canceled" },
  }]);
  await campaignCancelSchedule.execute({ id: "c1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/campaigns/c1/schedule");
});
