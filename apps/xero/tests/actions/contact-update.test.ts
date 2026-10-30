import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockXeroCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

test("contact-update: POSTs /Contacts/{id} with the fields envelope", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: { Contacts: [{ ContactID: "c1" }] } }]);
  await action.execute({ contactId: "c1", fields: { EmailAddress: "new@acme.test" } }, ctx);
  assertEquals(calls[0].url, "https://api.xero.com/api.xro/2.0/Contacts/c1");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { Contacts: [{ EmailAddress: "new@acme.test" }] });
});

test("contact-update: accepts fields as a JSON string", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: {} }]);
  await action.execute({ contactId: "c1", fields: '{"ContactStatus":"ARCHIVED"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { Contacts: [{ ContactStatus: "ARCHIVED" }] });
});
