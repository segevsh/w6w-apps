import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/confirm-order.ts";
import { description, executeKwArgs, mockCtx } from "../_helpers.ts";

Deno.test("confirm-order: is an idempotent perform over sale.order", () => {
  assertEquals(action.key, "confirm-order");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "sale.order");
  // Confirming an already-confirmed order leaves it confirmed and does not raise.
  assertEquals(action.idempotent, true);
});

Deno.test("confirm-order: calls action_confirm, NOT a write to state", async () => {
  // Verified live: action_confirm([[52]]) returned true and moved state
  // draft -> sale, running Odoo's full confirmation logic in one transaction.
  const { ctx, calls } = mockCtx([{ result: true }]);
  const out = await action.execute({ ids: 52 }, ctx);

  assertEquals(executeKwArgs(calls[0]), {
    model: "sale.order",
    method: "action_confirm",
    args: [[52]],
    kwargs: {},
  });
  assertEquals(out, { confirmed: true, ids: [52] });
});

Deno.test("confirm-order: confirms several orders in one call", async () => {
  const { ctx, calls } = mockCtx([{ result: true }]);
  await action.execute({ ids: "52,53" }, ctx);
  assertEquals(executeKwArgs(calls[0]).args, [[52, 53]]);
});

Deno.test("confirm-order: treats a non-false return as confirmation", async () => {
  // Some Odoo action_* methods return an action dict rather than a boolean.
  const { ctx } = mockCtx([{ result: { type: "ir.actions.act_window" } }]);
  const out = await action.execute({ ids: 52 }, ctx) as { confirmed: boolean };
  assertEquals(out.confirmed, true);
});

Deno.test("confirm-order: refuses to call out with no ids", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => action.execute({ ids: "" }, ctx) as Promise<unknown>);
  assertEquals(calls.length, 0);
});

Deno.test("confirm-order: explains it is a business transaction, not a status change", () => {
  assert(/transaction/i.test(description(action)));
});
