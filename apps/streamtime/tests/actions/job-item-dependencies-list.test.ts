import { assertEquals } from "@std/assert";
import jobItemDependenciesList from "../../actions/job-item-dependencies-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-dependencies-list: reads the dependencies route under the job", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: 1, parentJobItemId: 88, childJobItemId: 89, lagDays: 2 }] },
  ]);
  const result = await jobItemDependenciesList.execute({ jobId: 1010 }, ctx) as {
    dependencies: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/v2/jobs/1010/job_items/dependencies");
  assertEquals(result.dependencies.length, 1);
});

/** There is no create or delete route for a dependency, and the action says so. */
Deno.test("job-item-dependencies-list: it is read-only, and the description claims no more", () => {
  assertEquals(jobItemDependenciesList.type, "search");
  assertEquals(/Read-only/.test(jobItemDependenciesList.description ?? ""), true);
});
