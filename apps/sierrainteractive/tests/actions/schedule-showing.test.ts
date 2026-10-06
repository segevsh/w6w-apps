import { assertEquals } from "@std/assert";
import scheduleShowing from "../../actions/schedule-showing.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("schedule-showing: POST /zapier/scheduleShowing sends appointment preferences", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await scheduleShowing.execute({
    mlsNumber: "9",
    mlsRegion: "R",
    leadId: 7,
    preferredAppointmentDay: "Saturday",
    preferredAppointmentTime: "Morning",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/zapier/scheduleShowing");
  assertEquals(bodyOf(calls[0]), {
    mlsNumber: "9",
    mlsRegion: "R",
    leadId: 7,
    preferredAppointmentDay: "Saturday",
    preferredAppointmentTime: "Morning",
  });
});
