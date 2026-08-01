import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/activity-create.ts";

Deno.test("activity-create: POSTs a manual activity with sport_type only", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Evening Ride" } }]);
  const out = await action.execute({
    name: "Evening Ride",
    sportType: "Ride",
    startDateLocal: "2026-08-01T18:00:00Z",
    elapsedTime: 3600,
    trainer: true,
    commute: false,
  }, ctx);

  assertEquals(out, { id: 1, name: "Evening Ride" });
  assertEquals(calls[0].url, "https://www.strava.com/api/v3/activities");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Evening Ride");
  assertEquals(body.sport_type, "Ride");
  assertEquals(body.start_date_local, "2026-08-01T18:00:00Z");
  assertEquals(body.elapsed_time, 3600);
  assertEquals(body.trainer, 1);
  // commute: false is falsy -> compact() drops it along with the other unsets.
  assertEquals("commute" in body, false);
  assertEquals("type" in body, false);
});
