import { assertEquals } from "@std/assert";
import invoiceGet from "../../actions/invoice-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-get: uses the /api-prefixed path the reference spells", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "in1", amount: 25000, items: [] } }]);
  const out = await invoiceGet.execute({ invoiceId: "in1" }, ctx) as { amount: number };

  // Find Invoices is /invoices; this single read is /api/invoices/{uuid}.
  assertEquals(pathOf(calls[0].url), "/api/invoices/in1");
  assertEquals(out.amount, 25000);
});
