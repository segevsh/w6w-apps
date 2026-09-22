import { assert, assertEquals } from "@std/assert";
import { mockCtx, rejection } from "../_helpers.ts";
import action from "../../actions/create-company-customer.ts";

const BILLING = {
  address: "8 rue de la paix",
  postal_code: "75002",
  city: "Paris",
  country_alpha2: "FR",
};

Deno.test("create-company-customer: POSTs /company_customers with name and billing address", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, name: "Acme" } }]);
  await action.execute({ name: "Acme", billing_address: BILLING }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/company_customers");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Acme",
    billing_address: BILLING,
  });
});

Deno.test("create-company-customer: keeps every documented optional field, verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42 } }]);
  await action.execute({
    name: "Acme",
    billing_address: BILLING,
    vat_number: "FR12345678901",
    reg_no: "123456789",
    ledger_account: { number: "411100344" },
    phone: "+33612345678",
    delivery_address: { ...BILLING, city: "Lyon" },
    payment_conditions: "45_days",
    billing_iban: "FR1420041010050500013M02606",
    recipient: "John Doe",
    reference: "REF-1234",
    notes: "Some notes",
    emails: ["hello@example.org"],
    external_reference: "0e67fc3c-c632-4feb-ad34-e18ed5fbf66a",
    billing_language: "en_GB",
  }, ctx);

  const sent = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(sent).sort(), [
    "billing_address",
    "billing_iban",
    "billing_language",
    "delivery_address",
    "emails",
    "external_reference",
    "ledger_account",
    "name",
    "notes",
    "payment_conditions",
    "phone",
    "recipient",
    "reference",
    "reg_no",
    "vat_number",
  ]);
  assertEquals(sent.ledger_account, { number: "411100344" });
  assertEquals(sent.emails, ["hello@example.org"]);
});

Deno.test("create-company-customer: an untouched optional address is dropped, not sent empty", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42 } }]);
  await action.execute({
    name: "Acme",
    billing_address: BILLING,
    delivery_address: { address: "", postal_code: "", city: "", country_alpha2: "" },
    notes: "",
  }, ctx);

  const sent = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(sent).sort(), ["billing_address", "name"]);
});

Deno.test("create-company-customer: a 409 duplicate prints the vendor's `error` as the message", async () => {
  // The vendor's duplicate shape is `{ "status": 409, "error": "<message>" }` —
  // no `message` key at all.
  const { ctx } = mockCtx([{
    status: 409,
    body: { status: 409, error: "A customer with this external reference already exists" },
  }]);
  const err = await rejection(
    action.execute({ name: "Acme", billing_address: BILLING }, ctx),
  );
  assert(err instanceof Error);
  assert(
    err.message.includes("A customer with this external reference already exists"),
    err.message,
  );
});

Deno.test("create-company-customer: a 422 prints the actionable `details` object", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      error: "unprocessable_entity",
      message: "Missing required field: customer_id",
      details: { field: "customer_id", issue: "is required" },
    },
  }]);
  const err = await rejection(
    action.execute({ name: "Acme", billing_address: BILLING }, ctx),
  );
  assert(err instanceof Error);
  assert(err.message.includes("unprocessable_entity"), err.message);
  assert(err.message.includes('"field":"customer_id"'), err.message);
});
