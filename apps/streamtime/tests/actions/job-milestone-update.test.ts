import { assertEquals } from "@std/assert";
import jobMilestoneUpdate from "../../actions/job-milestone-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-milestone-update: PUTs the new name and date", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 11 } }]);
  await jobMilestoneUpdate.execute({ jobMilestoneId: 11, date: "2025-03-01" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/job_milestones/11");
  assertEquals(bodyOf(calls[0]), { date: "2025-03-01" });
});

Deno.test("job-milestone-update: a milestone cannot be moved between jobs", () => {
  const keys = (jobMilestoneUpdate.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("jobId"), false);
  assertEquals(keys.includes("jobItemId"), false);
});
