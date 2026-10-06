import { assertEquals, assertRejects } from "@std/assert";
import workorderStatusSet from "../../actions/workorder-status-set.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workorder-status-set: PATCH /v1/workorders/{id}/status with { status }", async () => {
  const { ctx, calls } = mockCtx([{ body: { workOrder: { id: 3, status: "DONE" } } }]);
  const out = await workorderStatusSet.execute({ workOrderId: 3, status: "DONE" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v1/workorders/3/status");
  assertEquals(bodyOf(calls[0]), { status: "DONE" });
  assertEquals(out, { id: 3, status: "DONE" });
});

Deno.test("workorder-status-set: SKIPPED is not offered (read-only value)", () => {
  const values = workorderStatusSet.params!.find((p) => p.key === "status")!.options as Array<
    { value: string }
  >;
  assertEquals(values.map((v) => v.value), ["OPEN", "IN_PROGRESS", "ON_HOLD", "DONE", "CANCELED"]);
});

Deno.test("workorder-status-set: an API error propagates", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("Invalid status") }]);
  await assertRejects(
    () => Promise.resolve(workorderStatusSet.execute({ workOrderId: 3, status: "DONE" }, ctx)),
    Error,
    "Invalid status",
  );
});
