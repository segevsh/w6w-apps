import { assertEquals } from "@std/assert";
import jobPhaseGet from "../../actions/job-phase-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-phase-get: reads GET /v2/job_phases/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3, name: "Initial Scoping", orderId: 1 } }]);
  const result = await jobPhaseGet.execute({ jobPhaseId: 3 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/job_phases/3");
  assertEquals(result.orderId, 1);
});
