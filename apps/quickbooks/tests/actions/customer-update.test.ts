import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/customer-update.ts";

Deno.test("customer-update: POSTs /customer with Id, SyncToken, sparse and merged fields", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { Customer: { Id: "1" } } }]);
  await action.execute({
    customerId: "1",
    syncToken: "2",
    fields: { CompanyName: "Acme Inc" },
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    Id: "1",
    SyncToken: "2",
    sparse: true,
    CompanyName: "Acme Inc",
  });
});
