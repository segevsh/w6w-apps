import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/activity-update.ts";

Deno.test("activity-update: PUTs only the editable fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, name: "Renamed" } }]);
  await action.execute({
    activityId: "42",
    name: "Renamed",
    gearId: "none",
    hideFromHome: true,
  }, ctx);

  assertEquals(calls[0].url, "https://www.strava.com/api/v3/activities/42");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Renamed");
  assertEquals(body.gear_id, "none");
  assertEquals(body.hide_from_home, true);
  assertEquals("sport_type" in body, false);
});
