import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/athlete-stats-get.ts";

Deno.test("athlete-stats-get: GETs the athlete's totals", async () => {
  const { ctx, calls } = mockCtx([{ body: { biggest_ride_distance: 1000 } }]);
  assertEquals(await action.execute({ athleteId: "1" }, ctx), { biggest_ride_distance: 1000 });
  assertEquals(calls[0].url, "https://www.strava.com/api/v3/athletes/1/stats");
});
