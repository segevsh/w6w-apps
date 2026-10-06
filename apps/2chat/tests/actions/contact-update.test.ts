import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import contactUpdate from "../../actions/contact-update.ts";

Deno.test("contact-update: sends only the changed fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "contact": { "uuid": "CON1" } } }]);
  await contactUpdate.execute!({ "contactUuid": "CON1", "firstName": "New" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/contacts/CON1");
  assertEquals(JSON.parse(calls[0].body!), { "first_name": "New" });
});

Deno.test("contact-update: parses contactDetails JSON text", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await contactUpdate.execute!(
    { "contactUuid": "CON1", "contactDetails": '[{"type":"E","value":"a@b.co"}]' } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/contacts/CON1");
  assertEquals(JSON.parse(calls[0].body!), {
    "contact_details": [{ "type": "E", "value": "a@b.co" }],
  });
});

Deno.test("contact-update: refuses an update that changes nothing", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await contactUpdate.execute!({ "contactUuid": "CON1" } as never, ctx);
  }, Error);
  assert(err.message.includes("at least one field"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});
