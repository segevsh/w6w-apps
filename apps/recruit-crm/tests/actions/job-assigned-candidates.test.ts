import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/job-assigned-candidates.ts";
import { mockCtx, paginator, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-assigned-candidates: GETs /jobs/{id}/assigned-candidates with paging", async () => {
  const { ctx, calls } = mockCtx([{ body: paginator([{ candidate_slug: 1 }], "next") }]);
  const out = await action.execute({ jobId: "8", limit: 10, page: 3 }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(pathOf(calls[0].url), "/v1/jobs/8/assigned-candidates");
  assertEquals(queryOf(calls[0].url), { limit: "10", page: "3" });
  assertEquals(out.count, 1);
  assertEquals(out.hasMore, true);
});

Deno.test("job-assigned-candidates: needs a job id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await (action.execute({ jobId: " " }, ctx)), Error, "id");
  assertEquals(calls.length, 0);
});
