import { assertEquals } from "@std/assert";
import jobMilestonesList from "../../actions/job-milestones-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-milestones-list: reads the nested route", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 11, name: "Client Presentation" }] }]);
  const result = await jobMilestonesList.execute({ jobId: 1010 }, ctx) as {
    milestones: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/v2/jobs/1010/job_milestones");
  assertEquals(result.milestones.length, 1);
});
