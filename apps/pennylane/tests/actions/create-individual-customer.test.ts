import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-individual-customer.ts";

const BILLING = {
  address: "1 rue Pasteur",
  postal_code: "69003",
  city: "Lyon",
  country_alpha2: "FR",
};

test("create-individual-customer: POSTs /individual_customers, not /company_customers", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7 } }]);
  await action.execute({ first_name: "Marie", last_name: "Curie", billing_address: BILLING }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/individual_customers");
  assertEquals(JSON.parse(calls[0].body!), {
    first_name: "Marie",
    last_name: "Curie",
    billing_address: BILLING,
  });
});

test("create-individual-customer: forwards the optional contact and ledger fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7 } }]);
  await action.execute({
    first_name: "Marie",
    last_name: "Curie",
    billing_address: BILLING,
    phone: "+33612345678",
    payment_conditions: "upon_receipt",
    ledger_account: { number: "411000" },
    emails: ["marie@example.org"],
    billing_language: "fr_FR",
  }, ctx);

  const sent = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(sent).sort(), [
    "billing_address",
    "billing_language",
    "emails",
    "first_name",
    "last_name",
    "ledger_account",
    "payment_conditions",
    "phone",
  ]);
});
