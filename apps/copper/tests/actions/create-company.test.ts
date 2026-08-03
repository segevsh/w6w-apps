import { assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import action from "../../actions/create-company.ts";

Deno.test("create-company: POSTs to /companies with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 9607580 } }]);
  await action.execute({
    name: "Demo Company",
    emailDomain: "democompany.com",
    address: { street: "123 Main Street", city: "Savannah" },
    details: "This is a demo company",
    phoneNumbers: [{ number: "415-123-45678", category: "work" }],
    primaryContactId: 27140359,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/companies");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Demo Company",
    email_domain: "democompany.com",
    address: { street: "123 Main Street", city: "Savannah" },
    details: "This is a demo company",
    phone_numbers: [{ number: "415-123-45678", category: "work" }],
    primary_contact_id: 27140359,
  });
});

Deno.test("create-company: is a non-idempotent perform — email domain is a unique key", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(param(action, "name").required, true);
});
