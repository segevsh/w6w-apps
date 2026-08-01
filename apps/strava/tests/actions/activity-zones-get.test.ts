import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/activity-zones-get.ts";

Deno.test("activity-zones-get: GETs zones for the activity", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ type: "heartrate" }] }]);
  const out = await action.execute({ activityId: "42" }, ctx);
  assertEquals(out, [{ type: "heartrate" }]);
  assertEquals(calls[0].url, "https://www.strava.com/api/v3/activities/42/zones");
});
