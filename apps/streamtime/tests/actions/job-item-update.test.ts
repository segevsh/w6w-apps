import { assertEquals } from "@std/assert";
import jobItemUpdate from "../../actions/job-item-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-update: PUTs the changed fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 88 } }]);
  await jobItemUpdate.execute({ jobItemId: 88, jobPhaseId: 3, sellRate: 120 }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/job_items/88");
  assertEquals(bodyOf(calls[0]), { jobPhaseId: 3, sellRate: 120 });
});

Deno.test("job-item-update: the computed totals and order are read-only", () => {
  const keys = (jobItemUpdate.params ?? []).map((p) => p.key);
  for (
    const readonly of [
      "jobId",
      "orderId",
      "totalLoggedMinutes",
      "earliestStartDate",
      "completeJobItemSubItems",
    ]
  ) {
    assertEquals(keys.includes(readonly), false, readonly);
  }
});
