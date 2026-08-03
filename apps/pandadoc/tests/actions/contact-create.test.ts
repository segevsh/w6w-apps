import { assertEquals } from "@std/assert";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs /contacts mapping camelCase to snake_case", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "c1", email: "a@b.com" } }]);
  const out = await action.execute({
    email: "a@b.com",
    firstName: "Ada",
    lastName: "Lovelace",
    company: "Acme",
    jobTitle: "CTO",
    phone: "+15550100",
    streetAddress: "1 Main St",
    city: "Springfield",
    state: "IL",
    postalCode: "62701",
    country: "US",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/public/v1/contacts");
  assertEquals(bodyOf(calls[0]), {
    email: "a@b.com",
    first_name: "Ada",
    last_name: "Lovelace",
    company: "Acme",
    job_title: "CTO",
    phone: "+15550100",
    street_address: "1 Main St",
    city: "Springfield",
    state: "IL",
    postal_code: "62701",
    country: "US",
  });
  assertEquals(out, { id: "c1", email: "a@b.com" });
});

Deno.test("contact-create: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ email: "a@b.com" }, ctx);
  assertEquals(bodyOf(calls[0]), { email: "a@b.com" });
});

Deno.test("contact-create: marks no param required — PandaDoc documents them all optional", () => {
  assertEquals(action.params?.some((p) => p.required), false);
});

Deno.test("contact-create: is a non-idempotent perform — there is no upsert", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
