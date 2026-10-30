import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactUpdate from "../../actions/contact-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("contact-update: PATCHes /contacts/{id}.json with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 3 }) }]);
  await contactUpdate.execute({ id: 3, name: "New Name" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/contacts/3.json");
  assertEquals(JSON.parse(calls[0].body!), { data: { name: "New Name" } });
});

test("contact-update: an email input replaces the default email_addresses entry", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 3 }) }]);
  await contactUpdate.execute({ id: 3, email: "new@acme.test" }, ctx);
  const body = JSON.parse(calls[0].body!).data;
  assertEquals(body.email_addresses, [{ address: "new@acme.test", default_email: true }]);
});
