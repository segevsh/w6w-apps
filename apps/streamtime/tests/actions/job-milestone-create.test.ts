import { assertEquals } from "@std/assert";
import jobMilestoneCreate from "../../actions/job-milestone-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-milestone-create: POSTs the milestone under the job", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 11, name: "Client Presentation" } }]);
  await jobMilestoneCreate.execute({
    jobId: 1010,
    name: "Client Presentation",
    date: "2025-02-01",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/jobs/1010/job_milestones");
  assertEquals(bodyOf(calls[0]), { name: "Client Presentation", date: "2025-02-01" });
});

Deno.test("job-milestone-create: the date param is a date, as the spec's format says", () => {
  const param = (jobMilestoneCreate.params ?? []).find((p) => p.key === "date");
  assertEquals(param?.type, "date");
});
