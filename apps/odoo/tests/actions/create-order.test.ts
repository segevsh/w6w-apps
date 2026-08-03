import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-order.ts";
import { executeKwArgs, mockCtx, param } from "../_helpers.ts";

Deno.test("create-order: is a non-idempotent perform over sale.order", () => {
  assertEquals(action.key, "create-order");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "sale.order");
  assertEquals(action.idempotent, false);
});

Deno.test("create-order: passes x2many line commands through verbatim", async () => {
  // [0, 0, {...}] is Odoo's "create a new linked record" opcode. Translating a
  // friendlier shape would silently limit what a workflow can express.
  const lines = [[0, 0, { product_id: 61, product_uom_qty: 2 }]];
  const { ctx, calls } = mockCtx([{ result: 70 }]);
  const out = await action.execute({ partnerId: 9, lines }, ctx);

  assertEquals(executeKwArgs(calls[0]), {
    model: "sale.order",
    method: "create",
    args: [{ partner_id: 9, order_line: lines }],
    kwargs: {},
  });
  assertEquals(out, { id: 70 });
});

Deno.test("create-order: accepts the line commands as a JSON string too", async () => {
  const { ctx, calls } = mockCtx([{ result: 1 }]);
  await action.execute({ partnerId: 9, lines: '[[0,0,{"product_id":61}]]' }, ctx);
  assertEquals(executeKwArgs(calls[0]).args, [
    { partner_id: 9, order_line: [[0, 0, { product_id: 61 }]] },
  ]);
});

Deno.test("create-order: omits order_line entirely when no lines are given", async () => {
  const { ctx, calls } = mockCtx([{ result: 1 }]);
  await action.execute({ partnerId: 9 }, ctx);
  assertEquals(executeKwArgs(calls[0]).args, [{ partner_id: 9 }]);
});

Deno.test("create-order: rejects malformed lines before calling out", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() =>
    action.execute({ partnerId: 9, lines: "{oops" }, ctx) as Promise<unknown>
  );
  await assertRejects(() =>
    action.execute({ partnerId: 9, lines: '{"a":1}' }, ctx) as Promise<unknown>
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-order: documents the x2many command format at the form", () => {
  assert(/x2many/i.test(param(action, "lines").hint ?? ""));
});
