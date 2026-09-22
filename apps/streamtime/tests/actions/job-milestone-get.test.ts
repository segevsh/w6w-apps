import { assertEquals } from "@std/assert";
import jobMilestoneGet from "../../actions/job-milestone-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-milestone-get: reads GET /v2/job_milestones/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 11, name: "Client Presentation", jobId: 1010 } }]);
  const result = await jobMilestoneGet.execute({ jobMilestoneId: 11 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/v2/job_milestones/11");
  assertEquals(result.jobId, 1010);
});
