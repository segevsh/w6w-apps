import { assertEquals } from "@std/assert";
import jobPhaseDelete from "../../actions/job-phase-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-phase-delete: DELETEs and reports the deletion", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await jobPhaseDelete.execute({ jobPhaseId: 3 }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/job_phases/3");
  assertEquals(result.deleted, true);
});

Deno.test("job-phase-delete: a replacement phase is sent as the documented query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await jobPhaseDelete.execute({ jobPhaseId: 3, replacementJobPhaseId: 4 }, ctx);
  assertEquals(queryOf(calls[0].url), { replacement_job_phase_id: "4" });
});

Deno.test("job-phase-delete: deleting the items is opt-in", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }, { status: 200 }]);
  await jobPhaseDelete.execute({ jobPhaseId: 3 }, ctx);
  assertEquals(queryOf(calls[0].url), {});

  await jobPhaseDelete.execute({ jobPhaseId: 3, deleteJobItemsAndExpenses: true }, ctx);
  assertEquals(queryOf(calls[1].url), { delete_job_items_and_expenses: "true" });
});

/** The vendor says the two options cannot be combined; so does this action. */
Deno.test("job-phase-delete: the mutually exclusive options are refused locally", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await jobPhaseDelete.execute({
      jobPhaseId: 3,
      replacementJobPhaseId: 4,
      deleteJobItemsAndExpenses: true,
    }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("cannot be combined"), true);
  assertEquals(calls.length, 0);
});
