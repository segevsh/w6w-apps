import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/invoice-delete.ts";

test("invoice-delete: DELETEs /invoices/{id}", async () => {
  const { ctx, calls } = mockNinjaCtx([{ status: 204 }]);
  const out = await action.execute({ invoiceId: "inv1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/invoices/inv1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, {});
});
