import { assertEquals } from "@std/assert";
import { connected, formObject, mockCtx } from "../_helpers.ts";
import action from "../../actions/update-customer.ts";

const ok = { status: 200, body: { customer: { id: "cust_1" } } };

Deno.test("update-customer: is an idempotent perform action", () => {
  assertEquals(action.key, "update-customer");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

Deno.test("update-customer: POSTs to /customers/{id} — Chargebee has no PUT or PATCH", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ customerId: "cust_1", email: "new@test.com" }, connected(ctx));
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/customers/cust_1");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("update-customer: sends only the fields actually supplied", async () => {
  // An unfilled optional field must never blank a stored value.
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    customerId: "cust_1",
    email: "new@test.com",
    firstName: "",
    company: undefined,
    invoiceNotes: "Net 30",
  }, connected(ctx));
  assertEquals(formObject(calls[0].body), {
    email: "new@test.com",
    invoice_notes: "Net 30",
  });
});

Deno.test("update-customer: the customer id goes in the path, never in the body", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ customerId: "cust_1", phone: "+1" }, connected(ctx));
  assertEquals(formObject(calls[0].body).id, undefined);
  assertEquals(formObject(calls[0].body).customer_id, undefined);
});

Deno.test("update-customer: meta_data is JSON-encoded here too", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ customerId: "cust_1", metaData: { a: 1 } }, connected(ctx));
  assertEquals(formObject(calls[0].body), { meta_data: '{"a":1}' });
});

Deno.test("update-customer: exposes no billing address — that has its own endpoint", () => {
  // Chargebee replaces rather than merges `billing_address`, and documents
  // `update_billing_info` for it. A half-filled address here would drop fields.
  const keys = (action.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("billingAddress"), false);
});
