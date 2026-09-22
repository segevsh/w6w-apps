import { assertEquals } from "@std/assert";
import jobPhaseUpdate from "../../actions/job-phase-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-phase-update: PUTs the new name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3, name: "Discovery" } }]);
  await jobPhaseUpdate.execute({ jobPhaseId: 3, name: "Discovery" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/job_phases/3");
  assertEquals(bodyOf(calls[0]), { name: "Discovery" });
});

Deno.test("job-phase-update: orderId is read-only", () => {
  assertEquals((jobPhaseUpdate.params ?? []).some((p) => p.key === "orderId"), false);
});
