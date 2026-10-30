import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx } from "../_helpers.ts";

test("contact-update: PUTs /contacts/:id and returns the updated contact", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact: { id: 1, full_name: "Margaret Smith" } } }]);
  const out = await contactUpdate.execute({ contactId: 1, lastName: "Smith" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/contacts/1");
  assertEquals(JSON.parse(calls[0].body!), { last_name: "Smith" });
  assertEquals(out.contact.full_name, "Margaret Smith");
});

test("contact-update: is idempotent", () => {
  assertEquals(contactUpdate.idempotent, true);
});
