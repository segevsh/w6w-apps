import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/create-lead.ts";

Deno.test("create-lead: POSTs to /leads with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 8894157 } }]);
  await action.execute({
    name: "My Lead",
    email: { email: "mylead@example.com", category: "work" },
    phoneNumbers: [{ number: "415-123-45678", category: "mobile" }],
    address: { street: "123 Main Street", city: "Savannah" },
    customerSourceId: 331242,
    customFields: [{ custom_field_definition_id: 100764, value: "short" }],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/leads");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "My Lead",
    email: { email: "mylead@example.com", category: "work" },
    phone_numbers: [{ number: "415-123-45678", category: "mobile" }],
    address: { street: "123 Main Street", city: "Savannah" },
    customer_source_id: 331242,
    custom_fields: [{ custom_field_definition_id: 100764, value: "short" }],
  });
});

Deno.test("create-lead: sends `email` singular, never an `emails` array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ name: "L", email: { email: "a@b.com" } }, ctx);
  const body = JSON.parse(calls[0].body!);
  assert("email" in body, "no singular email key");
  assert(!("emails" in body), "sent a plural emails array — that is the People shape");
  assert(!Array.isArray(body.email), "email must be an object, not an array");
});

Deno.test("create-lead: uses Copper's documented Lead status strings", () => {
  assertEquals(optionValues(action, "status"), ["New", "Unqualified", "Contacted", "Qualified"]);
});

Deno.test("create-lead: company name is free text — a Lead links to no Company record", () => {
  assertEquals(param(action, "companyName").type, "string");
});

Deno.test("create-lead: is a non-idempotent perform requiring only a name", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals((action.params ?? []).filter((p) => p.required).map((p) => p.key), ["name"]);
});
