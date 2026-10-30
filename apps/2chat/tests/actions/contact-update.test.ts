import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx, rejects } from "../_helpers.ts";
import contactUpdate from "../../actions/contact-update.ts";

test("contact-update: sends only the changed fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "contact": { "uuid": "CON1" } } }]);
  await contactUpdate.execute!({ "contactUuid": "CON1", "firstName": "New" } as never, ctx);
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "PUT");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/contacts/CON1");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), { "first_name": "New" });
});

test("contact-update: parses contactDetails JSON text", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await contactUpdate.execute!(
    { "contactUuid": "CON1", "contactDetails": '[{"type":"E","value":"a@b.co"}]' } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "PUT");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/contacts/CON1");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), {
    "contact_details": [{ "type": "E", "value": "a@b.co" }],
  });
});

test("contact-update: refuses an update that changes nothing", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await contactUpdate.execute!({ "contactUuid": "CON1" } as never, ctx);
  });
  assert.ok(err.message.includes("at least one field"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});
