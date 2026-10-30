import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import { mockShopifyCtx } from "../_helpers.ts";
import action from "../../actions/customer-create.ts";

test("customer-create: POSTs /customers.json", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: { customer: { id: 1 } } }]);
  await action.execute({ email: "jo@acme.test", firstName: "Jo" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    customer: { email: "jo@acme.test", first_name: "Jo" },
  });
});

test("customer-create: uses the modern marketing-consent shape", async () => {
  const { ctx, calls } = mockShopifyCtx([{ body: {} }]);
  await action.execute({ email: "jo@acme.test", acceptsMarketing: true }, ctx);
  // The legacy `accepts_marketing` boolean is deprecated.
  assertEquals(JSON.parse(calls[0].body!).customer.email_marketing_consent, {
    state: "subscribed",
  });
});

test("customer-create: rejects a contactless customer before any request", () => {
  const { ctx, calls } = mockShopifyCtx();
  assertThrows(() => action.execute({ firstName: "Jo" }, ctx), Error, "at least an `email`");
  assertEquals(calls.length, 0);
});
