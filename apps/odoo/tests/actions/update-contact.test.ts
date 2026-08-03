import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-contact.ts";
import { executeKwArgs, mockCtx } from "../_helpers.ts";

Deno.test("update-contact: is an idempotent perform over res.partner", () => {
  assertEquals(action.key, "update-contact");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

Deno.test("update-contact: write takes [ids, vals] BOTH positionally, in that order", async () => {
  const { ctx, calls } = mockCtx([{ result: true }]);
  const out = await action.execute({ ids: "42", name: "Renamed" }, ctx);

  assertEquals(executeKwArgs(calls[0]), {
    model: "res.partner",
    method: "write",
    args: [[42], { name: "Renamed" }],
    kwargs: {},
  });
  assertEquals(out, { updated: true, ids: [42] });
});

Deno.test("update-contact: writes the same values to every id given", async () => {
  const { ctx, calls } = mockCtx([{ result: true }]);
  await action.execute({ ids: "1,2", email: "x@y.com" }, ctx);
  assertEquals(executeKwArgs(calls[0]).args, [[1, 2], { email: "x@y.com" }]);
});

Deno.test("update-contact: refuses a write with nothing to change", async () => {
  // An empty vals dict would be a pointless round trip, and usually a mistake.
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => action.execute({ ids: "1" }, ctx) as Promise<unknown>);
  assertEquals(calls.length, 0);
});

Deno.test("update-contact: passes an explicit false through, so a field can be cleared", async () => {
  // Odoo's idiom for emptying a field is `false`; only `undefined` is dropped.
  const { ctx, calls } = mockCtx([{ result: true }]);
  await action.execute({ ids: "1", values: { phone: false } }, ctx);
  assertEquals(executeKwArgs(calls[0]).args, [[1], { phone: false }]);
});
