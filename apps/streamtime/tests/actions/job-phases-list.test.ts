import { assertEquals } from "@std/assert";
import jobPhasesList from "../../actions/job-phases-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-phases-list: reads the nested route", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 3, jobId: 1010, name: "Initial Scoping" }] }]);
  const result = await jobPhasesList.execute({ jobId: 1010 }, ctx) as { phases: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/jobs/1010/job_phases");
  assertEquals(result.phases.length, 1);
});
