import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/expense-create.ts";

test("expense-create: POSTs /expenses with the amount", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "e1" } }]);
  await action.execute({ amount: 42.5, vendorId: "v1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/expenses");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.amount, 42.5);
  assertEquals(body.vendor_id, "v1");
});
