import { assertEquals } from "@std/assert";
import invoiceTrackedLineItemsList from "../../actions/invoice-tracked-line-items-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-tracked-line-items-list: returns the untyped body under a name", async () => {
  const { ctx, calls } = mockCtx([{ body: { JobItem: [{ id: 88 }] } }]);
  const result = await invoiceTrackedLineItemsList.execute({ invoiceId: 3456 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/v2/invoices/3456/tracked_line_items");
  assertEquals(result.trackedLineItems, { JobItem: [{ id: 88 }] });
});
