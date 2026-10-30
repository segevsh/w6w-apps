import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import action from "../../actions/get-order.ts";
import { description, executeKwArgs, mockCtx } from "../_helpers.ts";

test("get-order: is a read action over sale.order", () => {
  assertEquals(action.key, "get-order");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "sale.order");
});

test("get-order: read takes ids positionally", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 69 }] }]);
  await action.execute({ ids: 69, fields: "name,state" }, ctx);
  assertEquals(executeKwArgs(calls[0]), {
    model: "sale.order",
    method: "read",
    args: [[69]],
    kwargs: { fields: ["name", "state"] },
  });
});

test("get-order: warns that order_line returns ids, not line contents", () => {
  assert(/order_line/.test(description(action)));
  assert(/sale\.order\.line/.test(description(action)));
});
