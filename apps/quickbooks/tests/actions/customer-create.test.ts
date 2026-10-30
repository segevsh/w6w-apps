import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/customer-create.ts";

test("customer-create: POSTs /customer with DisplayName", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { Customer: { Id: "1" } } }]);
  await action.execute({ displayName: "Acme Co" }, ctx);
  assertEquals(
    calls[0].url,
    "https://quickbooks.api.intuit.com/v3/company/123145/customer?minorversion=75",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { DisplayName: "Acme Co" });
});

test("customer-create: merges additionalFields", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: {} }]);
  await action.execute({
    displayName: "Acme Co",
    additionalFields: { PrimaryEmailAddr: { Address: "a@b.com" } },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    DisplayName: "Acme Co",
    PrimaryEmailAddr: { Address: "a@b.com" },
  });
});
