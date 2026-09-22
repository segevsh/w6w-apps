import { assertEquals } from "@std/assert";
import jobItemCreate from "../../actions/job-item-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-create: POSTs the item under the job", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 88, name: "UI Design" } }]);
  await jobItemCreate.execute({ jobId: 1010, name: "UI Design", totalPlannedMinutes: 240 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/jobs/1010/job_items");
  assertEquals(bodyOf(calls[0]), { name: "UI Design", totalPlannedMinutes: 240 });
});

Deno.test("job-item-create: isBillable=false survives, because false is not 'unset'", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 88 } }]);
  await jobItemCreate.execute({ jobId: 1010, name: "UI Design", isBillable: false }, ctx);
  assertEquals(bodyOf(calls[0]).isBillable, false);
});

Deno.test("job-item-create: the three lookup objects are forwarded as JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 88 } }]);
  await jobItemCreate.execute({
    jobId: 1010,
    name: "UI Design",
    costingMethod: '{"id":1,"name":"Fixed Fee"}',
    timeAllocationMethod: '{"id":2,"name":"Time By Item"}',
  }, ctx);
  assertEquals(bodyOf(calls[0]).costingMethod, { id: 1, name: "Fixed Fee" });
  assertEquals(bodyOf(calls[0]).timeAllocationMethod, { id: 2, name: "Time By Item" });
});
