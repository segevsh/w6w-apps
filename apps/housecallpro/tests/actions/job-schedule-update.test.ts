import { assertEquals } from "@std/assert";
import jobScheduleUpdate from "../../actions/job-schedule-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-schedule-update: PUTs the schedule window", async () => {
  const { ctx, calls } = mockCtx([{ body: { start_time: "2026-03-23T15:30:00" } }]);
  await jobScheduleUpdate.execute({
    jobId: "j1",
    startTime: "2026-03-23T15:30:00",
    endTime: "2026-03-23T16:30:00",
    arrivalWindowInMinutes: 60,
    notify: true,
  }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/jobs/j1/schedule");
  assertEquals(bodyOf(calls[0]), {
    start_time: "2026-03-23T15:30:00",
    end_time: "2026-03-23T16:30:00",
    arrival_window_in_minutes: 60,
    notify: true,
  });
});

Deno.test("job-schedule-update: employee ids are wrapped as {employee_id} objects", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await jobScheduleUpdate.execute({
    jobId: "j1",
    startTime: "2026-03-23T15:30:00",
    dispatchedEmployeeIds: "e1,e2",
  }, ctx);

  assertEquals(bodyOf(calls[0]).dispatched_employees, [
    { employee_id: "e1" },
    { employee_id: "e2" },
  ]);
});

Deno.test("job-schedule-update: only start_time is required, matching the reference", () => {
  const required = (jobScheduleUpdate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["jobId", "startTime"]);
});

Deno.test("job-schedule-update: says the endpoint needs a partner credential", () => {
  assertEquals(jobScheduleUpdate.description?.includes("integration-partner"), true);
});
