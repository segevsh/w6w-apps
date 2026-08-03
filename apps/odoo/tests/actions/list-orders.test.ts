import { assert, assertEquals } from "@std/assert";
import action from "../../actions/list-orders.ts";
import { description, executeKwArgs, mockCtx } from "../_helpers.ts";

Deno.test("list-orders: is a search action over sale.order", () => {
  assertEquals(action.key, "list-orders");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "sale.order");
});

Deno.test("list-orders: filters quotations from orders by state, in one model", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 52, state: "draft" }] }]);
  await action.execute({ domain: [["state", "=", "draft"]] }, ctx);
  assertEquals(executeKwArgs(calls[0]), {
    model: "sale.order",
    method: "search_read",
    args: [],
    kwargs: { domain: [["state", "=", "draft"]] },
  });
});

Deno.test("list-orders: explains the quotation/order state lifecycle", () => {
  assert(/draft/.test(description(action)));
  assert(/sale/.test(description(action)));
});
