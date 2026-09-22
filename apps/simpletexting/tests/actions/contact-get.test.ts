import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

const CONTACT = {
  contactId: "507f1f77bcf86cd799439011",
  contactPhone: "1234567890",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  lists: [{ id: "507f191e810c19729de860ea", name: "My First List" }],
  customFields: { zipcode: "12345" },
  subscriptionStatus: "OPT_IN",
  updateSource: "PUBLIC_API",
  created: "2021-04-28T23:20:08.489Z",
  updated: "2021-04-29T23:20:08.489Z",
};

Deno.test("contact-get: reads a contact by phone number, the vendor's preferred form", async () => {
  const { ctx, calls } = mockCtx([{ body: CONTACT }]);
  const result = await contactGet.execute({ contactIdOrNumber: "1234567890" }, ctx) as {
    contactId: string;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/api/contacts/1234567890`);
  assertEquals(result.contactId, CONTACT.contactId);
});

Deno.test("contact-get: a phone number pasted in any format stays one path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: CONTACT }]);
  await contactGet.execute({ contactIdOrNumber: "+1 (555) 123-4567" }, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/api/contacts/%2B1%20(555)%20123-4567`);
});

/**
 * The response's required members include `firstName`, `lastName` and `email`,
 * so a contact created with only a phone number answers with them present and
 * empty rather than absent.
 */
Deno.test("contact-get: declares the members the schema requires, not just the interesting ones", () => {
  const output = contactGet.output;
  const keys = (Array.isArray(output) ? output : []).map((o) => o.key);
  for (const key of ["contactId", "contactPhone", "firstName", "lastName", "email"]) {
    assertEquals(keys.includes(key), true, `${key} missing from output`);
  }
  assertEquals(keys.includes("lists"), true);
});

Deno.test("contact-get: is a read action", () => {
  assertEquals(contactGet.type, "read");
  assertEquals(contactGet.resource, "contact");
});
