import { assertEquals } from "@std/assert";
import jobInvoiceList from "../../actions/job-invoice-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-invoice-list: reads the unenveloped {invoices} shape", async () => {
  const { ctx, calls } = mockCtx([
    { body: { invoices: [{ id: "in1", amount: 25000, due_amount: 0 }] } },
  ]);
  const out = await jobInvoiceList.execute({ jobId: "j1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/jobs/j1/invoices");
  assertEquals(out.items, [{ id: "in1", amount: 25000, due_amount: 0 }]);
});
