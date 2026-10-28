import { assertEquals } from "@std/assert";
import { mockFreshdeskCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs /contacts with the contact fields", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: { id: 1, name: "Jo" } }]);
  await action.execute({ name: "Jo", email: "jo@acme.test" }, ctx);
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Jo", email: "jo@acme.test" });
});

Deno.test("contact-create: parses the custom-fields JSON param", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: {} }]);
  await action.execute({ name: "Jo", customFields: { customer_type: "vip" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).custom_fields, { customer_type: "vip" });
});
