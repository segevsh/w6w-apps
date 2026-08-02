import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-create.ts";

const LINES = [{
  DetailType: "SalesItemLineDetail",
  Amount: 100,
  Description: "Consulting",
  SalesItemLineDetail: { ItemRef: { value: "1" } },
}];

Deno.test("invoice-create: POSTs /invoice with CustomerRef and Line", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { Invoice: { Id: "1" } } }]);
  await action.execute({ customerId: "42", lines: LINES }, ctx);
  assertEquals(
    calls[0].url,
    "https://quickbooks.api.intuit.com/v3/company/123145/invoice?minorversion=75",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    CustomerRef: { value: "42" },
    Line: LINES,
  });
});

Deno.test("invoice-create: merges additionalFields and accepts lines as a JSON string", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: {} }]);
  await action.execute({
    customerId: "42",
    lines: JSON.stringify(LINES),
    additionalFields: { DueDate: "2026-08-14" },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.Line, LINES);
  assertEquals(body.DueDate, "2026-08-14");
});
