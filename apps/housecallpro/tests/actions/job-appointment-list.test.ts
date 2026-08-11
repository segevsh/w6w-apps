import { assertEquals } from "@std/assert";
import jobAppointmentList from "../../actions/job-appointment-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-appointment-list: reads the unenveloped {appointments} shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { appointments: [{ id: "ap1" }, { id: "ap2" }] } }]);
  const out = await jobAppointmentList.execute({ jobId: "j1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/jobs/j1/appointments");
  assertEquals(out.items.length, 2);
  assertEquals(out.totalItems, undefined);
});
