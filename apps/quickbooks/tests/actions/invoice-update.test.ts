import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-update.ts";

Deno.test("invoice-update: POSTs /invoice with Id, SyncToken, sparse and merged fields", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { Invoice: { Id: "1" } } }]);
  await action.execute({
    invoiceId: "1",
    syncToken: "3",
    fields: { PrivateNote: "Paid by wire" },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    Id: "1",
    SyncToken: "3",
    sparse: true,
    PrivateNote: "Paid by wire",
  });
});
