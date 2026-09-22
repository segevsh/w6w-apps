import { assertEquals } from "@std/assert";
import jobItemsList from "../../actions/job-items-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-items-list: reads the nested list of ACTIVE items", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 88, name: "UI Design" }] }]);
  const result = await jobItemsList.execute({ jobId: 1010 }, ctx) as { jobItems: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/jobs/1010/job_items");
  assertEquals(result.jobItems.length, 1);
});

Deno.test("job-items-list: the description carries the vendor's 'active' qualifier", () => {
  assertEquals(/active job items/.test(jobItemsList.description ?? ""), true);
});
