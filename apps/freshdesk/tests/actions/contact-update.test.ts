import { assertEquals } from "@std/assert";
import { mockFreshdeskCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PUTs /contacts/:id with only the set fields", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: { id: 4, name: "Jo B." } }]);
  await action.execute({ contactId: 4, name: "Jo B." }, ctx);
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/contacts/4");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "Jo B." });
});

Deno.test("contact-update: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
