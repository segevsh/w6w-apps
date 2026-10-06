import { assertEquals } from "@std/assert";
import workorderUpdate from "../../actions/workorder-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workorder-update: PATCH /v1/workorders/{id} sends only set fields and unwraps", async () => {
  const { ctx, calls } = mockCtx([{ body: { workOrder: { id: 5, title: "New" } } }]);
  const out = await workorderUpdate.execute(
    { workOrderId: 5, title: "New", dueDate: "2026-12-01T00:00:00.000Z" },
    ctx,
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v1/workorders/5");
  assertEquals(bodyOf(calls[0]), { title: "New", dueDate: "2026-12-01T00:00:00.000Z" });
  assertEquals(out, { id: 5, title: "New" });
});

Deno.test("workorder-update: status is not part of the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { workOrder: {} } }]);
  await workorderUpdate.execute({ workOrderId: 1, assigneeTeamIds: "2" } as never, ctx);
  assertEquals(bodyOf(calls[0]), { assignees: [{ type: "TEAM", id: 2 }] });
});
