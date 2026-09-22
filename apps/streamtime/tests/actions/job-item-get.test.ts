import { assertEquals } from "@std/assert";
import jobItemGet from "../../actions/job-item-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-get: reads GET /v2/job_items/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: 88, name: "UI Design", totalLoggedMinutes: 120 },
  }]);
  const result = await jobItemGet.execute({ jobItemId: 88 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/job_items/88");
  assertEquals(result.totalLoggedMinutes, 120);
});
