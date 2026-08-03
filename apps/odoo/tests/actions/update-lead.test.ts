import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-lead.ts";
import { executeKwArgs, mockCtx } from "../_helpers.ts";

Deno.test("update-lead: is an idempotent perform over crm.lead", () => {
  assertEquals(action.key, "update-lead");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

Deno.test("update-lead: moving a pipeline stage is a stage_id write", async () => {
  const { ctx, calls } = mockCtx([{ result: true }]);
  const out = await action.execute({ ids: "27", stageId: 3 }, ctx);
  assertEquals(executeKwArgs(calls[0]), {
    model: "crm.lead",
    method: "write",
    args: [[27], { stage_id: 3 }],
    kwargs: {},
  });
  assertEquals(out, { updated: true, ids: [27] });
});

Deno.test("update-lead: maps the forecast fields to Odoo names", async () => {
  const { ctx, calls } = mockCtx([{ result: true }]);
  await action.execute({ ids: 27, expectedRevenue: 100, probability: 50 }, ctx);
  assertEquals(executeKwArgs(calls[0]).args, [[27], { expected_revenue: 100, probability: 50 }]);
});

Deno.test("update-lead: refuses a write with nothing to change", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => action.execute({ ids: "1" }, ctx) as Promise<unknown>);
  assertEquals(calls.length, 0);
});
