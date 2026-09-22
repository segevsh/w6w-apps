import { assertEquals } from "@std/assert";
import jobGet from "../../actions/job-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-get: reads GET /v2/jobs/{id} with its rolled-up totals", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 1010, name: "Website Redesign", totalLoggedMinutes: 480 } },
  ]);
  const result = await jobGet.execute({ jobId: 1010 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/jobs/1010");
  assertEquals(result.totalLoggedMinutes, 480);
});

/** There is no `GET /jobs` list — the action's own docs must not imply one. */
Deno.test("job-get: it reads one job, and points at search for finding ids", () => {
  assertEquals(jobGet.type, "read");
  assertEquals(/search over `jobs`/.test(jobGet.params?.[0].hint ?? ""), true);
});
