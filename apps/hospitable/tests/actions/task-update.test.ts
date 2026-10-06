import { assertEquals } from "@std/assert";
import taskUpdate from "../../actions/task-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const requiredOf = (a: { params?: Array<{ key: string; required?: boolean }> }) =>
  (a.params ?? []).filter((p) => p.required).map((p) => p.key).sort();

Deno.test("task-update: PATCH sends only what changed; unassign sends an explicit null", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }, { body: { data: {} } }]);
  await taskUpdate.execute(
    { id: "k1", note: "moved", payment_amount: 0, payment_currency: "USD" },
    ctx,
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/tasks/k1");
  assertEquals(JSON.parse(calls[0].body!), {
    note: "moved",
    payment: { amount: 0, currency: "USD" },
  });

  await taskUpdate.execute({ id: "k1", teammate_uuid: "t9", unassign_teammate: true }, ctx);
  assertEquals(JSON.parse(calls[1].body!), { teammate_uuid: null });
  assertEquals(requiredOf(taskUpdate), ["id"]);
});
