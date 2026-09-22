import { assertEquals } from "@std/assert";
import jobCreate from "../../actions/job-create.ts";
import { bodyOf, mockCtx, pathOf, writeAck } from "../_helpers.ts";

Deno.test("job-create: POSTs the body to /job/create/ with auth_secret", async () => {
  const { ctx, calls } = mockCtx([{ body: writeAck([{ UUID: "j1", ClientId: 42, link: "x" }]) }]);
  const out = await jobCreate.execute(
    { authSecret: "sec_xyz", FirstName: "Dana", JobDateTime: "2026-09-23T09:00:00Z" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/job/create/");
  assertEquals(bodyOf(calls[0]), {
    auth_secret: "sec_xyz",
    FirstName: "Dana",
    JobDateTime: "2026-09-23T09:00:00Z",
  });
  assertEquals(out.data, [{ UUID: "j1", ClientId: 42, link: "x" }]);
});

/** The job body's schedule pair is JobDateTime/JobEndDateTime, not the lead's. */
Deno.test("job-create: schedules with the job's own date-time fields", () => {
  const keys = (jobCreate.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("JobDateTime"), true);
  assertEquals(keys.includes("JobEndDateTime"), true);
  assertEquals(keys.includes("LeadDateTime"), false);
});

Deno.test("job-create: creating is not idempotent", () => {
  assertEquals(jobCreate.idempotent, false);
  assertEquals(jobCreate.type, "perform");
});
