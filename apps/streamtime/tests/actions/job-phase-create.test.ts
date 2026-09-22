import { assertEquals } from "@std/assert";
import jobPhaseCreate from "../../actions/job-phase-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-phase-create: POSTs the one writable field", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3, name: "Initial Scoping" } }]);
  await jobPhaseCreate.execute({ jobId: 1010, name: "Initial Scoping" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/jobs/1010/job_phases");
  // `orderId` is read-only, so it is not sent even though a phase has one.
  assertEquals(bodyOf(calls[0]), { name: "Initial Scoping" });
});
