import { assertEquals, assertRejects } from "@std/assert";
import workorderGet from "../../actions/workorder-get.ts";
import { errorBody, mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("workorder-get: GET /v1/workorders/{id} unwraps { workOrder }", async () => {
  const { ctx, calls } = mockCtx([{ body: { workOrder: { id: 5, title: "T" } } }]);
  const out = await workorderGet.execute({ workOrderId: 5, expand: "asset,parts" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/workorders/5");
  assertEquals(queryAll(calls[0].url), { expand: ["asset", "parts"] });
  assertEquals(out, { id: 5, title: "T" });
});

Deno.test("workorder-get: a 404 surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Work Order not found") }]);
  await assertRejects(
    () => Promise.resolve(workorderGet.execute({ workOrderId: 1 }, ctx)),
    Error,
    "Work Order not found",
  );
});
