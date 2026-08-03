import { assert, assertEquals, assertRejects } from "@std/assert";
import { connected, formObject, formPairs, mockCtx } from "../_helpers.ts";
import action from "../../actions/create-customer.ts";

const ok = { status: 200, body: { customer: { id: "cust_1" } } };

Deno.test("create-customer: is a non-idempotent perform action", () => {
  assertEquals(action.key, "create-customer");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "customer");
  // This App sends no `chargebee-idempotency-key`, so a retry creates a second
  // customer unless the caller supplies their own id.
  assertEquals(action.idempotent, false);
});

Deno.test("create-customer: POSTs form-encoded, not JSON", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ firstName: "John" }, connected(ctx));
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/customers");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "first_name=John");
});

Deno.test("create-customer: maps camelCase params onto Chargebee's snake_case fields", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    id: "cust_1",
    firstName: "John",
    lastName: "Doe",
    email: "john@test.com",
    phone: "+18004445555",
    company: "Bluth",
    preferredCurrencyCode: "USD",
    autoCollection: "off",
    netTermDays: 30,
    locale: "fr-CA",
  }, connected(ctx));

  assertEquals(formObject(calls[0].body), {
    id: "cust_1",
    first_name: "John",
    last_name: "Doe",
    email: "john@test.com",
    phone: "+18004445555",
    company: "Bluth",
    preferred_currency_code: "USD",
    auto_collection: "off",
    net_term_days: "30",
    locale: "fr-CA",
  });
});

Deno.test("create-customer: sends the billing address in BRACKET form", async () => {
  // Chargebee's own sample:
  //   -d "billing_address[line1]"="PO Box 9999" -d "billing_address[city]"="Walnut"
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    billingAddress: { line1: "PO Box 9999", city: "Walnut", state: "California", country: "US" },
  }, connected(ctx));

  assertEquals(formPairs(calls[0].body), [
    ["billing_address[line1]", "PO Box 9999"],
    ["billing_address[city]", "Walnut"],
    ["billing_address[state]", "California"],
    ["billing_address[country]", "US"],
  ]);
});

Deno.test("create-customer: accepts the billing address as a JSON string too", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ billingAddress: '{"city":"Walnut"}' }, connected(ctx));
  assertEquals(formObject(calls[0].body), { "billing_address[city]": "Walnut" });
});

Deno.test("create-customer: sends meta_data JSON-encoded, NOT bracket-expanded", async () => {
  // The one parameter here that Chargebee reads as a JSON string — matching the
  // official SDKs' level-0 `jsonKeys` handling.
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ metaData: { crm_id: "abc", tier: 2 } }, connected(ctx));
  assertEquals(formObject(calls[0].body), { meta_data: '{"crm_id":"abc","tier":2}' });
});

Deno.test("create-customer: omits every field the caller left blank", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ email: "a@b.com", firstName: "", lastName: undefined }, connected(ctx));
  assertEquals(calls[0].body, "email=a%40b.com");
});

Deno.test("create-customer: rejects malformed JSON instead of silently dropping it", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ metaData: "{not json" }, connected(ctx));
    },
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0, "nothing should reach the network");
});

Deno.test("create-customer: exposes no card or bank account params", () => {
  // Chargebee's own guidance is to capture payment sources through their
  // dedicated APIs, and raw PAN data has no business in a workflow engine.
  const keys = (action.params ?? []).map((p) => p.key);
  for (const forbidden of ["card", "bankAccount", "bank_account", "token", "paymentMethod"]) {
    assertEquals(keys.includes(forbidden), false, `should not expose ${forbidden}`);
  }
  assert(/payment/i.test(action.description ?? ""), "the description should say so");
});
